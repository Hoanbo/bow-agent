// src/core/governedRuntimeCompliance/GovernedRuntimeComplianceTypes.ts
// Component 1188: GovernedRuntimeComplianceTypes (REAL)
//
// Canonical contracts, branded IDs, 8-category violation taxonomy, sliding window models,
// 32 audit event types, typed error hierarchy, and pure deterministic SHA-256 hashers for MS-1.5.22.
// Định nghĩa các giao ước chuẩn, định danh branded, phân loại vi phạm 8 nhóm, mô hình cửa sổ trượt,
// 32 loại sự kiện kiểm toán, hệ thống phân cấp lỗi và các hàm băm SHA-256 tiền định cho MS-1.5.22.

import { createHash } from 'node:crypto';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyLifecycleState } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';

// ============================================================================
// 1. BRANDED IDENTIFIERS
// ============================================================================
export type RuntimeObservationId = string & { readonly __brand: unique symbol };
export type ComplianceEvaluationId = string & { readonly __brand: unique symbol };
export type AssuranceScoreId = string & { readonly __brand: unique symbol };
export type ComplianceDossierId = string & { readonly __brand: unique symbol };
export type RuntimeComplianceAuditRecordId = string & { readonly __brand: unique symbol };

// ============================================================================
// 2. RUNTIME COMPLIANCE VERDICTS & TAXONOMY
// ============================================================================

export type RuntimeActionClassification =
  | 'OBSERVE'
  | 'RECOMMEND'
  | 'REVERSIBLE'
  | 'HIGH_IMPACT'
  | 'FORBIDDEN';

export type RuntimeComplianceVerdict =
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'DIVERGENT'
  | 'ANOMALOUS';

export type PolicyViolationCategory =
  | 'AUTHORIZATION_VIOLATION'
  | 'POLICY_RULE_VIOLATION'
  | 'TENANT_BOUNDARY_VIOLATION'
  | 'LIFECYCLE_STATE_VIOLATION'
  | 'SAFETY_INTERLOCK_VIOLATION'
  | 'BEHAVIORAL_DRIFT'
  | 'TEMPORAL_ORDER_VIOLATION'
  | 'REPEATED_NONCOMPLIANCE';

export type ViolationSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

export type AssuranceState =
  | 'ASSURED_COMPLIANT'
  | 'ASSURED_DEGRADED'
  | 'ASSURED_BREACHED';

// ============================================================================
// 3. HARD CEILINGS, WEIGHTS & THRESHOLDS
// ============================================================================
export const ASSURANCE_THRESHOLD_COMPLIANT = 0.95;
export const ASSURANCE_THRESHOLD_DEGRADED = 0.85;

export const WEIGHT_COMPLIANCE_RATIO = 0.50;
export const WEIGHT_VIOLATION_PENALTY = 0.30;
export const WEIGHT_DRIFT_MAGNITUDE = 0.15;
export const WEIGHT_OBSERVATION_FRESHNESS = 0.05;

export const FRESHNESS_DECAY_HALF_LIFE_SEC = 1800; // 30 minutes
export const MAX_SLIDING_WINDOW_OBSERVATIONS = 100;
export const MAX_SLIDING_WINDOW_DURATION_SEC = 3600; // 1 hour
export const MAX_CLOCK_SKEW_TOLERANCE_MS = 60_000; // 60 seconds
export const MAX_AUDIT_BATCH_SIZE = 100;
export const GENESIS_PREV_HASH = '0'.repeat(64);

export const SEVERITY_WEIGHT_TABLE: Readonly<Record<ViolationSeverity, number>> = Object.freeze({
  CRITICAL: 10.0,
  HIGH: 5.0,
  MEDIUM: 2.0,
  LOW: 0.5,
});
export const MAX_SEVERITY_WEIGHT = 10.0;

// ============================================================================
// 4. CONSTITUTIONAL INVARIANTS
// ============================================================================
export const GOVERNED_RUNTIME_COMPLIANCE_INVARIANTS = Object.freeze([
  'SOLE_HUMAN_AUTHORITY = TRUE',
  'HUMAN_AUTHORITY_COUNT = 1',
  'SECOND_HUMAN_AUTHORITY = FORBIDDEN',
  'ACTIVE_TWO_PERSON_AUTHORITY = NONE',
  'AGENT_CAPABILITY != HUMAN_AUTHORITY',
  'HUMAN_APPROVAL != AUTO_APPROVE',
  'OBSERVATION != EXECUTION',
  'OBSERVATION != AUTHORIZATION',
  'OBSERVATION != POLICY_MUTATION',
  'DECISION != AUTHORIZATION',
  'AUTHORIZATION != MUTATION',
  'HASH != AUTHORIZATION',
  'EVIDENCE != AUTHORIZATION',
  'EVIDENCE != MUTATION_AUTHORITY',
  'ASSURANCE_SCORE != AUTHORIZATION',
  'COMPLIANCE_RESULT != AUTHORIZATION',
  'AUTOMATION != REACTIVATION',
  'ROLLBACK != POLICY_CREATION',
  'ROLLBACK != ESCALATION',
  'EMERGENCY_STOP > GOVERNANCE',
  'EMERGENCY_STOP > RUNTIME_COMPLIANCE',
  'STORE_REFERENCE != MUTATION_AUTHORITY',
  'RETIRED_IS_TERMINAL',
  'TENANT_BOUNDARY_STRICT',
]);

// ============================================================================
// 5. CANONICAL CONTRACT INTERFACES
// ============================================================================

export interface RuntimeBehavioralProfile {
  readonly observationId: RuntimeObservationId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly timestamp: string;
  readonly actionName: string;
  readonly actionClassification: RuntimeActionClassification;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly executionOutcome: 'SUCCESS' | 'FAILURE' | 'EXCEPTION';
  readonly sessionId?: string;
  readonly agentId?: string;
  readonly sequenceNumber: number;
}

export interface ActivePolicyBinding {
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly policyVersion: number;
  readonly canonicalPolicyHash: string;
  readonly boundAt: string;
  readonly lifecycleState: PolicyLifecycleState;
}

export interface ComplianceEvaluationRecord {
  readonly evaluationId: ComplianceEvaluationId;
  readonly observationId: RuntimeObservationId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly policyVersion: number;
  readonly canonicalPolicyHash: string;
  readonly verdict: RuntimeComplianceVerdict;
  readonly matchedRules: readonly string[];
  readonly violatedRules: readonly string[];
  readonly divergenceScore: number;
  readonly evaluatedAt: string;
  readonly reason: string;
}

export interface PolicyViolationRecord {
  readonly violationId: string;
  readonly evaluationId: ComplianceEvaluationId;
  readonly observationId: RuntimeObservationId;
  readonly category: PolicyViolationCategory;
  readonly severity: ViolationSeverity;
  readonly description: string;
  readonly evidenceDetails: Readonly<Record<string, unknown>>;
  readonly detectedAt: string;
}

export interface OperationalAssuranceScore {
  readonly scoreId: AssuranceScoreId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly scoreValue: number; // A in [0.0, 1.0]
  readonly state: AssuranceState;
  readonly observationCount: number;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly complianceRatio: number;
  readonly severityPenalty: number;
  readonly driftMagnitude: number;
  readonly freshnessFactor: number;
  readonly criticalViolationPresent: boolean;
  readonly computedAt: string;
}

export interface CumulativeDriftState {
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly cumulativeMagnitude: number; // in [0.0, 1.0]
  readonly driftVelocity: number;
  readonly sampleCount: number;
  readonly lastEvaluatedAt: string;
}

export interface SafetyControlDecision {
  readonly decisionId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly triggeredAction: 'FLAG' | 'DEGRADE' | 'SUSPEND' | 'NONE';
  readonly reason: string;
  readonly assuranceScoreValue: number;
  readonly criticalViolations: readonly string[];
  readonly executedAt: string;
}

export interface RuntimeComplianceEvidenceDossier {
  readonly dossierId: ComplianceDossierId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly policyVersion: number;
  readonly canonicalPolicyHash: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly observationCount: number;
  readonly assuranceScore: number;
  readonly assuranceState: AssuranceState;
  readonly violationSummary: Readonly<Record<PolicyViolationCategory, number>>;
  readonly sha256Fingerprint: string;
  readonly compiledAt: string;
}

// ============================================================================
// 6. 32 CANONICAL AUDIT EVENT TYPES
// ============================================================================
export type RuntimeComplianceAuditEventType =
  | 'OBSERVATION_INGESTED'
  | 'OBSERVATION_SANITIZED'
  | 'OBSERVATION_REPLAY_REJECTED'
  | 'OBSERVATION_RATE_LIMITED'
  | 'POLICY_BINDING_RESOLVED'
  | 'POLICY_BINDING_FAILED'
  | 'POLICY_VERSION_MISMATCH'
  | 'POLICY_HASH_MISMATCH'
  | 'COMPLIANCE_EVALUATION_STARTED'
  | 'COMPLIANCE_EVALUATED_COMPLIANT'
  | 'COMPLIANCE_EVALUATED_NON_COMPLIANT'
  | 'COMPLIANCE_EVALUATED_DIVERGENT'
  | 'COMPLIANCE_EVALUATED_ANOMALOUS'
  | 'VIOLATION_DETECTED_CRITICAL'
  | 'VIOLATION_DETECTED_HIGH'
  | 'VIOLATION_DETECTED_MEDIUM'
  | 'VIOLATION_DETECTED_LOW'
  | 'BEHAVIORAL_DRIFT_EVALUATED'
  | 'BEHAVIORAL_DRIFT_ACCELERATED'
  | 'ASSURANCE_SCORE_COMPUTED'
  | 'ASSURANCE_THRESHOLD_BREACHED'
  | 'SAFETY_CONTAINMENT_FLAGGED'
  | 'SAFETY_DEGRADATION_TRIGGERED'
  | 'SAFETY_SUSPENSION_TRIGGERED'
  | 'AUTOMATION_REACTIVATION_BLOCKED'
  | 'EMERGENCY_STOP_ENFORCED'
  | 'TENANT_BOUNDARY_BREACH_REJECTED'
  | 'TEMPORAL_CLOCK_SKEW_REJECTED'
  | 'EVIDENCE_DOSSIER_COMPILED'
  | 'AUDIT_LEDGER_APPENDED'
  | 'AUDIT_LEDGER_CHAIN_VERIFIED'
  | 'AUDIT_LEDGER_CORRUPTION_DETECTED';

export interface RuntimeComplianceAuditEvent {
  readonly auditRecordId: RuntimeComplianceAuditRecordId;
  readonly sequenceNumber: number;
  readonly eventType: RuntimeComplianceAuditEventType;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly timestamp: string;
  readonly payloadHash: string;
  readonly prevHash: string;
  readonly eventHash: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ============================================================================
// 7. DETERMINISTIC SHA-256 HASH FUNCTIONS
// ============================================================================

export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJsonStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJsonStringify((obj as Record<string, unknown>)[k])}`
  );
  return `{${entries.join(',')}}`;
}

export function computeSha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function computeObservationHash(profile: RuntimeBehavioralProfile): string {
  return computeSha256(canonicalJsonStringify(profile));
}

export function computeEvaluationHash(record: ComplianceEvaluationRecord): string {
  return computeSha256(canonicalJsonStringify(record));
}

export function computeAssuranceHash(score: OperationalAssuranceScore): string {
  return computeSha256(canonicalJsonStringify(score));
}

export function computeDossierFingerprint(
  dossierWithoutFingerprint: Omit<RuntimeComplianceEvidenceDossier, 'sha256Fingerprint'>
): string {
  return computeSha256(canonicalJsonStringify(dossierWithoutFingerprint));
}

export function computeAuditEventHash(
  prevHash: string,
  eventWithoutHashes: Omit<RuntimeComplianceAuditEvent, 'eventHash' | 'payloadHash' | 'prevHash'>,
  payload: Record<string, unknown>
): { payloadHash: string; eventHash: string } {
  const payloadHash = computeSha256(canonicalJsonStringify(payload));
  const rawToHash = `${prevHash}|${payloadHash}|${canonicalJsonStringify(eventWithoutHashes)}`;
  const eventHash = computeSha256(rawToHash);
  return { payloadHash, eventHash };
}

// ============================================================================
// 8. TYPED ERROR HIERARCHY
// ============================================================================

export class RuntimeComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeComplianceError';
  }
}

export class ObservationSanitizationError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[ObservationSanitizationError] ${message}`);
    this.name = 'ObservationSanitizationError';
  }
}

export class PolicyVersionBindingMismatchError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[PolicyVersionBindingMismatchError] ${message}`);
    this.name = 'PolicyVersionBindingMismatchError';
  }
}

export class PolicySnapshotUnavailableError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[PolicySnapshotUnavailableError] ${message}`);
    this.name = 'PolicySnapshotUnavailableError';
  }
}

export class TemporalClockSkewError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[TemporalClockSkewError] ${message}`);
    this.name = 'TemporalClockSkewError';
  }
}

export class ObservationSequenceError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[ObservationSequenceError] ${message}`);
    this.name = 'ObservationSequenceError';
  }
}

export class ObservationReplayError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[ObservationReplayError] ${message}`);
    this.name = 'ObservationReplayError';
  }
}

export class DeterministicEvaluationError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[DeterministicEvaluationError] ${message}`);
    this.name = 'DeterministicEvaluationError';
  }
}

export class AssuranceScoringError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[AssuranceScoringError] ${message}`);
    this.name = 'AssuranceScoringError';
  }
}

export class PolicyViolationDetectedError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[PolicyViolationDetectedError] ${message}`);
    this.name = 'PolicyViolationDetectedError';
  }
}

export class AdaptiveSafetyControlError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[AdaptiveSafetyControlError] ${message}`);
    this.name = 'AdaptiveSafetyControlError';
  }
}

export class AutomatedReactivationForbiddenError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[AutomatedReactivationForbiddenError] ${message}`);
    this.name = 'AutomatedReactivationForbiddenError';
  }
}

export class TenantAccessForbiddenError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[TenantAccessForbiddenError] ${message}`);
    this.name = 'TenantAccessForbiddenError';
  }
}

export class RuntimeComplianceAuditLedgerError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[RuntimeComplianceAuditLedgerError] ${message}`);
    this.name = 'RuntimeComplianceAuditLedgerError';
  }
}

export class EmergencyStopActiveError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[EmergencyStopActiveError] ${message}`);
    this.name = 'EmergencyStopActiveError';
  }
}

export class SecondaryAuthorityRejectedError extends RuntimeComplianceError {
  constructor(message: string) {
    super(`[SecondaryAuthorityRejectedError] ${message}`);
    this.name = 'SecondaryAuthorityRejectedError';
  }
}
