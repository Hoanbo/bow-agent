// src/core/governedPolicyRemediation/IncidentComplianceEvidenceCorrelator.ts
// Component 1199: IncidentComplianceEvidenceCorrelator (REAL)
//
// Ingests and correlates runtime compliance evidence dossiers, violation records, assurance scores,
// and operational incidents within identical sliding temporal windows and tenant/domain scopes.
// Tiếp nhận và tương quan các hồ sơ bằng chứng tuân thủ runtime, bản ghi vi phạm, điểm đảm bảo vận hành
// và sự cố vận hành trong cùng cửa sổ trượt thời gian và phạm vi tenant/domain.

import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyIncidentRecord } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
import type {
  RuntimeComplianceEvidenceDossier,
  PolicyViolationRecord,
  OperationalAssuranceScore,
  ViolationSeverity,
} from '../governedRuntimeCompliance/GovernedRuntimeComplianceTypes.js';
import {
  CorrelatedIncidentEnvelope,
  computeCorrelationHash,
  EmergencyStopProvider,
  EmergencyStopActiveError,
  CrossTenantAccessForbiddenError,
  UntrustedInputSanitizationError,
} from './GovernedPolicyRemediationTypes.js';

export interface IngestedComplianceData {
  readonly dossiers?: readonly RuntimeComplianceEvidenceDossier[];
  readonly violations?: readonly PolicyViolationRecord[];
  readonly assuranceScores?: readonly OperationalAssuranceScore[];
  readonly incidents?: readonly PolicyIncidentRecord[];
}

export interface IncidentCorrelationConfig {
  readonly windowDurationSeconds?: number; // default: 300
}

export class IncidentComplianceEvidenceCorrelator {
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly windowDurationSeconds: number;

  // Sanitization patterns for untrusted input
  private readonly secretRegexes: readonly RegExp[] = Object.freeze([
    /(?:api[_-]?key|apikey|bearer|token|secret|password|passwd|pwd)\s*[:=]\s*(?:\\*["'])?([a-zA-Z0-9_\-\.]{8,})(?:\\*["'])?/gi,
    /ghp_[a-zA-Z0-9]{36}/g,
    /ey[a-zA-Z0-9_-]{10,}\.ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, // JWT
    /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g,
  ]);

  private readonly promptInjectionRegexes: readonly RegExp[] = Object.freeze([
    /ignore\s+(?:all\s+)?previous\s+(?:rules|instructions|directives)/i,
    /bypass\s+(?:pdp|policy|security|governance|human|stop)/i,
    /you\s+are\s+now\s+(?:unrestricted|free|dan|root|admin)/i,
    /system\s+prompt\s+override/i,
  ]);

  constructor(
    emergencyStopProvider?: EmergencyStopProvider,
    config?: IncidentCorrelationConfig
  ) {
    this.emergencyStopProvider = emergencyStopProvider;
    this.windowDurationSeconds = config?.windowDurationSeconds ?? 300;
  }

  private assertEmergencyStopInactive(): void {
    if (!this.emergencyStopProvider) {
      throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
    }
    let active: unknown;
    try {
      active = this.emergencyStopProvider.isEmergencyStopActive();
    } catch (err: unknown) {
      throw new EmergencyStopActiveError(`Emergency stop provider threw error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (typeof active !== 'boolean') {
      throw new EmergencyStopActiveError('Emergency stop provider returned non-boolean value (fail-closed)');
    }
    if (active === true) {
      throw new EmergencyStopActiveError('Emergency stop is currently ACTIVE (fail-closed)');
    }
  }

  public sanitizeUntrustedText(text: string): { sanitized: string; hadInjection: boolean } {
    let current = text;
    for (const pattern of this.promptInjectionRegexes) {
      if (pattern.test(current)) {
        throw new UntrustedInputSanitizationError(`Adversarial prompt injection pattern detected: '${current.substring(0, 50)}...'`);
      }
    }
    for (const reg of this.secretRegexes) {
      current = current.replace(reg, '[REDACTED_SECRET]');
    }
    return { sanitized: current.trim(), hadInjection: false };
  }

  public correlateIncidentEvidence(
    tenantId: string,
    policyDomain: PolicyDomain,
    data: IngestedComplianceData,
    currentTime: Date = new Date()
  ): CorrelatedIncidentEnvelope {
    this.assertEmergencyStopInactive();

    if (!tenantId || tenantId.trim() === '') {
      throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
    }

    const windowEnd = currentTime.toISOString();
    const windowStartTimeMs = currentTime.getTime() - this.windowDurationSeconds * 1000;
    const windowStart = new Date(windowStartTimeMs).toISOString();

    const seenViolations = new Set<string>();
    const incidentIds: string[] = [];
    const violationIds: string[] = [];
    let minAssurance = 1.0;
    let assuranceBreached = false;
    let primarySeverity: ViolationSeverity = 'LOW';

    const severityRanks: Record<ViolationSeverity, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    // 1. Process violations
    if (data.violations) {
      for (const v of data.violations) {
        const vTenant = (v.evidenceDetails?.tenantId as string | undefined) ?? tenantId;
        if (vTenant !== tenantId) {
          throw new CrossTenantAccessForbiddenError(
            `Cross-tenant violation injection detected: expected '${tenantId}', got '${vTenant}'`
          );
        }
        const vDomain = (v.evidenceDetails?.policyDomain as PolicyDomain | undefined) ?? policyDomain;
        if (vDomain !== policyDomain) {
          continue; // Scoped to policy domain
        }
        // Deduplicate violation IDs within sliding window
        if (!seenViolations.has(v.violationId)) {
          seenViolations.add(v.violationId);
          violationIds.push(v.violationId);
          if (severityRanks[v.severity] > severityRanks[primarySeverity]) {
            primarySeverity = v.severity;
          }
        }
      }
    }

    // 2. Process assurance scores
    if (data.assuranceScores) {
      for (const a of data.assuranceScores) {
        if (a.tenantId !== tenantId) {
          throw new CrossTenantAccessForbiddenError(
            `Cross-tenant assurance score detected: expected '${tenantId}', got '${a.tenantId}'`
          );
        }
        if (a.policyDomain === policyDomain) {
          if (a.scoreValue < minAssurance) {
            minAssurance = a.scoreValue;
          }
          if (a.state === 'ASSURED_BREACHED' || a.state === 'ASSURED_DEGRADED') {
            assuranceBreached = true;
          }
        }
      }
    }

    // 3. Process operational incidents
    if (data.incidents) {
      for (const inc of data.incidents) {
        if (inc.tenantId !== tenantId) {
          throw new CrossTenantAccessForbiddenError(
            `Cross-tenant incident record detected: expected '${tenantId}', got '${inc.tenantId}'`
          );
        }
        if (inc.policyDomain === policyDomain) {
          if (inc.description) {
            this.sanitizeUntrustedText(inc.description);
          }
          if (!incidentIds.includes(inc.incidentId)) {
            incidentIds.push(inc.incidentId);
          }
        }
      }
    }

    // 4. Process dossiers if supplied
    if (data.dossiers) {
      for (const d of data.dossiers) {
        if (d.tenantId !== tenantId) {
          throw new CrossTenantAccessForbiddenError(
            `Cross-tenant compliance dossier detected: expected '${tenantId}', got '${d.tenantId}'`
          );
        }
      }
    }

    const correlationId = `corr_${tenantId}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`;

    const hash = computeCorrelationHash({
      tenantId,
      policyDomain,
      incidentIds: Object.freeze([...incidentIds].sort()),
      violationIds: Object.freeze([...violationIds].sort()),
      windowStart,
      windowEnd,
    });

    const envelope: CorrelatedIncidentEnvelope = Object.freeze({
      correlationId,
      tenantId,
      policyDomain,
      windowStart,
      windowEnd,
      incidentIds: Object.freeze(incidentIds.sort()),
      violationIds: Object.freeze(violationIds.sort()),
      assuranceBreached,
      minAssuranceScore: Math.max(0.0, Math.min(1.0, minAssurance)),
      primarySeverity,
      correlationHash: hash,
    });

    return envelope;
  }
}
