// src/core/diagnosis/incidentClassificationEngine.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Deterministic Incident Classification & Blast-Radius Engine.
// Evaluates correlated evidence clusters, root-cause hypotheses, and health metrics to assign
// deterministic incident severity and blast radius without initiating remediation.
// Động cơ phân loại sự cố và bán kính ảnh hưởng xác định.
// Đánh giá các cụm bằng chứng tương quan, giả thuyết nguyên nhân gốc và chỉ số sức khỏe để gán
// mức độ nghiêm trọng và bán kính ảnh hưởng xác định mà không khởi tạo khắc phục.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - INCIDENT_CLASSIFICATION != REMEDIATION_PERMISSION: A CRITICAL rating carries zero remediation authority.
// - DETERMINISTIC EVALUATION: Strict ordered rules determine severity without LLM non-determinism.
// - UNKNOWN vs CONFLICTED: Missing data is UNKNOWN; contradictory multi-agent signal is CONFLICTED.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import type { ObservabilityHealthState } from '../observability/observabilityTypes.js';
import type {
  CorrelatedEvidenceCluster,
  RootCauseHypothesis,
  IncidentClassification,
  IncidentSeverity,
  BlastRadius,
} from './diagnosisTypes.js';
import { createIncidentId } from './diagnosisTypes.js';

export interface IncidentClassificationInput {
  readonly cluster: CorrelatedEvidenceCluster;
  readonly hypotheses: readonly RootCauseHypothesis[];
  readonly currentHealth?: ObservabilityHealthState;
  readonly telemetrySampleCount?: number;
  readonly isConflicted?: boolean;
  readonly canaryRollbackRecommended?: boolean;
}

export class IncidentClassificationEngine {
  /**
   * Classifies an incident, assigning deterministic severity and blast radius.
   * Phân loại sự cố, gán mức độ nghiêm trọng và bán kính ảnh hưởng xác định.
   */
  public classify(input: IncidentClassificationInput): IncidentClassification {
    const rationale: string[] = [];
    const items = input.cluster.items;
    const sampleCount = input.telemetrySampleCount ?? 10; // Default nominal sample count

    // -------------------------------------------------------------------------
    // 1. EVALUATE SEVERITY / ĐÁNH GIÁ MỨC ĐỘ NGHIÊM TRỌNG
    // -------------------------------------------------------------------------
    let severity: IncidentSeverity = 'INFORMATIONAL';

    // A. Check CONFLICTED state first (Multi-agent contradiction)
    if (input.isConflicted) {
      severity = 'CONFLICTED';
      rationale.push('Multi-agent assertions contain unresolved contradictions on health or failure categories.');
    }
    // B. Check UNKNOWN state (Insufficient telemetry data or missing streams)
    else if (sampleCount < 3) {
      severity = 'UNKNOWN';
      rationale.push(`Insufficient observational telemetry: sample count (${sampleCount}) is below minimum threshold (3).`);
    }
    // C. Check CRITICAL conditions
    else {
      const hasProtectedWorkspaceViolation = items.some(
        (i) => i.source === 'INVARIANT' && i.category === 'PROTECTED_WORKSPACE'
      );
      const hasBoundaryViolation = items.some(
        (i) => i.source === 'INVARIANT' && (i.category === 'BOUNDARY' || i.category === 'USER_STOP' || i.category === 'REVOCATION')
      );
      const hasCriticalDriftMutation = items.some(
        (i) => i.source === 'DRIFT' && i.severity === 'CRITICAL' && i.category === 'UNAUTHORIZED_MUTATION'
      );
      const isHealthCritical = input.currentHealth === 'CRITICAL';

      if (hasProtectedWorkspaceViolation || hasBoundaryViolation || hasCriticalDriftMutation || isHealthCritical) {
        severity = 'CRITICAL';
        if (hasProtectedWorkspaceViolation) rationale.push('CRITICAL: Protected workspace boundary violation detected.');
        if (hasBoundaryViolation) rationale.push('CRITICAL: Core boundary or safety switch invariant violated.');
        if (hasCriticalDriftMutation) rationale.push('CRITICAL: Unauthorized filesystem or state mutation drift detected.');
        if (isHealthCritical) rationale.push('CRITICAL: Observability mesh reported composite CRITICAL health state.');
      }
      // D. Check HIGH conditions
      else {
        const hasCanaryRegression = items.some(
          (i) => i.source === 'TELEMETRY' && i.severity === 'HIGH'
        );
        const hasHighAlert = items.some((i) => i.source === 'ALERT' && i.severity === 'HIGH');
        const hasCanaryRollback = input.canaryRollbackRecommended === true;

        if (hasCanaryRegression || hasHighAlert || hasCanaryRollback) {
          severity = 'HIGH';
          if (hasCanaryRegression) rationale.push('HIGH: Consecutive canary degradation streak detected.');
          if (hasHighAlert) rationale.push('HIGH: High-severity advisory alert triggered.');
          if (hasCanaryRollback) rationale.push('HIGH: Canary verification engine recommended rollback.');
        }
        // E. Check MEDIUM conditions
        else {
          const driftCount = items.filter((i) => i.source === 'DRIFT').length;
          const invariantViolationCount = items.filter((i) => i.source === 'INVARIANT').length;

          if (driftCount > 1 || invariantViolationCount > 0) {
            severity = 'MEDIUM';
            if (driftCount > 1) rationale.push(`MEDIUM: Multi-metric drift detected (${driftCount} drift events).`);
            if (invariantViolationCount > 0) rationale.push(`MEDIUM: Non-boundary invariant violation detected (${invariantViolationCount} violations).`);
          }
          // F. Check LOW conditions
          else if (items.length > 0) {
            severity = 'LOW';
            rationale.push('LOW: Benign drift or isolated warning alert within acceptable operating tolerance.');
          }
          // G. INFORMATIONAL
          else {
            severity = 'INFORMATIONAL';
            rationale.push('INFORMATIONAL: All invariants satisfied, no drift detected, system nominal.');
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. EVALUATE BLAST RADIUS / ĐÁNH GIÁ BÁN KÍNH ẢNH HƯỞNG
    // -------------------------------------------------------------------------
    let blastRadius: BlastRadius = 'COMPONENT';

    const affectedSubsystems = new Set<string>();
    for (const h of input.hypotheses) {
      affectedSubsystems.add(h.primarySubsystem);
    }
    for (const item of items) {
      affectedSubsystems.add(item.category);
    }

    const isCoreTarget =
      input.cluster.targetId.includes('gateway') ||
      input.cluster.targetId.includes('root') ||
      input.cluster.targetId.includes('mesh') ||
      input.cluster.targetId.includes('global');

    if (isCoreTarget || affectedSubsystems.size > 2 || severity === 'CRITICAL') {
      blastRadius = 'SYSTEM_WIDE';
    } else if (affectedSubsystems.size > 1 || severity === 'HIGH' || severity === 'MEDIUM') {
      blastRadius = 'SUBSYSTEM';
    } else {
      blastRadius = 'COMPONENT';
    }

    const evaluatedAt = Date.now();
    const incidentHash = crypto
      .createHash('sha256')
      .update(`${input.cluster.clusterId}:${severity}:${blastRadius}:${evaluatedAt}`)
      .digest('hex')
      .substring(0, 10);

    const incidentId = createIncidentId(`inc_${severity.toLowerCase()}_${incidentHash}`);

    return {
      incidentId,
      severity,
      blastRadius,
      rationale: Object.freeze(rationale),
      evaluatedAt,
    };
  }
}

export const globalIncidentClassificationEngine = new IncidentClassificationEngine();
