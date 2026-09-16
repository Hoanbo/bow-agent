// src/core/governedPolicyRemediation/GovernedPolicyRemediationTypes.ts
// Component 1198: GovernedPolicyRemediationTypes (REAL)
//
// Canonical contracts, branded IDs, 10-category failure root-cause taxonomy, circuit breaker states,
// 32 audit event types, typed error hierarchy, and pure deterministic SHA-256 hashers for MS-1.5.23.
// Định nghĩa các giao ước chuẩn, định danh branded, phân loại nguyên nhân gốc 10 nhóm, trạng thái circuit breaker,
// 32 loại sự kiện kiểm toán, hệ thống phân cấp lỗi và các hàm băm SHA-256 tiền định cho MS-1.5.23.

import { createHash } from 'node:crypto';
import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyLifecycleState } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
import type { ViolationSeverity } from '../governedRuntimeCompliance/GovernedRuntimeComplianceTypes.js';

// ============================================================================
// 1. BRANDED IDENTIFIERS
// ============================================================================
export type RemediationId = string & { readonly __brand: unique symbol };
export type RootCauseDiagnosisId = string & { readonly __brand: unique symbol };
export type CircuitBreakerStateId = string & { readonly __brand: unique symbol };
export type RemediationDossierId = string & { readonly __brand: unique symbol };
export type RemediationAuditRecordId = string & { readonly __brand: unique symbol };
export type HandoffId = string & { readonly __brand: unique symbol };

export interface EmergencyStopProvider {
  isEmergencyStopActive(): boolean;
}

// Helper to brand strings safely
export function asRemediationId(id: string): RemediationId {
  return id as RemediationId;
}
export function asRootCauseDiagnosisId(id: string): RootCauseDiagnosisId {
  return id as RootCauseDiagnosisId;
}
export function asCircuitBreakerStateId(id: string): CircuitBreakerStateId {
  return id as CircuitBreakerStateId;
}
export function asRemediationDossierId(id: string): RemediationDossierId {
  return id as RemediationDossierId;
}
export function asRemediationAuditRecordId(id: string): RemediationAuditRecordId {
  return id as RemediationAuditRecordId;
}
export function asHandoffId(id: string): HandoffId {
  return id as HandoffId;
}

// ============================================================================
// 2. ROOT CAUSE TAXONOMY (10 CANONICAL CATEGORIES)
// ============================================================================
export type RootCauseCategory =
  | 'RULE_OVER_RESTRICTION'
  | 'PARAMETER_LIMIT_MISMATCH'
  | 'BEHAVIORAL_DRIFT_CASCADE'
  | 'CROSS_DOMAIN_INVARIANT_CONFLICT'
  | 'LIFECYCLE_STATE_TIMING_RACE'
  | 'ENVIRONMENTAL_PRECONDITION_COLLAPSE'
  | 'AUTHORIZATION_TOKEN_EXHAUSTION'
  | 'TEMPORAL_CLOCK_DESYNCHRONIZATION'
  | 'TENANT_DOMAIN_MISALLOCATION'
  | 'UNKNOWN_ANOMALOUS_MUTATION';

export const ALL_ROOT_CAUSE_CATEGORIES: readonly RootCauseCategory[] = Object.freeze([
  'RULE_OVER_RESTRICTION',
  'PARAMETER_LIMIT_MISMATCH',
  'BEHAVIORAL_DRIFT_CASCADE',
  'CROSS_DOMAIN_INVARIANT_CONFLICT',
  'LIFECYCLE_STATE_TIMING_RACE',
  'ENVIRONMENTAL_PRECONDITION_COLLAPSE',
  'AUTHORIZATION_TOKEN_EXHAUSTION',
  'TEMPORAL_CLOCK_DESYNCHRONIZATION',
  'TENANT_DOMAIN_MISALLOCATION',
  'UNKNOWN_ANOMALOUS_MUTATION',
]);

// ============================================================================
// 3. REMEDIATION ACTION TYPES & CANDIDATE LIFECYCLE
// ============================================================================
export type RemediationActionType =
  | 'AMEND_POLICY_RULE'
  | 'CLAMP_PARAMETER_LIMIT'
  | 'ROLLBACK_POLICY_VERSION'
  | 'QUARANTINE_ACTION';

export type RemediationLifecycleState =
  | 'GENERATED'
  | 'DIAGNOSIS_BOUND'
  | 'RISK_BOUND'
  | 'REVIEW_PENDING'
  | 'HANDED_OFF'
  | 'REVIEWED'
  | 'SUPERSEDED'
  | 'REJECTED'
  | 'EXPIRED';

// ============================================================================
// 4. BLAST RADIUS & RISK CLASSIFICATION
// ============================================================================
export type BlastRadiusRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AnonymizedDependencyTopology {
  readonly sharedResourcePoolId: string;
  readonly downstreamTenantCount: number;
  readonly topologicalHopCount: number;
  readonly sharedServiceType: 'DATABASE_POOL' | 'NETWORK_ROUTER' | 'MESSAGE_BUS' | 'INFERENCE_ENGINE';
}

export interface PolicyBlastRadiusRiskRecord {
  readonly riskAnalysisId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly rootCauseDiagnosisId: RootCauseDiagnosisId;
  readonly riskScore: number; // [0.0, 1.0]
  readonly riskLevel: BlastRadiusRiskLevel;
  readonly impactedWorkflowsCount: number;
  readonly crossDomainRippleDetected: boolean;
  readonly anonymizedTopologySummary?: AnonymizedDependencyTopology;
  readonly analysisTimestamp: string;
  readonly blastRadiusHash: string;
}

// ============================================================================
// 5. CIRCUIT BREAKER STATES & PARAMETERS
// ============================================================================
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerParameters {
  readonly failureWindowSeconds: number; // default: 300
  readonly failureThreshold: number; // default: 3
  readonly initialCooldownSeconds: number; // default: 300
  readonly backoffMultiplier: number; // default: 2.0
  readonly maxCooldownSeconds: number; // default: 3600
  readonly maxHalfOpenProbes: number; // default: 1
  readonly resetSuccessThreshold: number; // default: 2
  readonly lockoutThreshold: number; // default: 5 consecutive trips
}

export const DEFAULT_CIRCUIT_BREAKER_PARAMS: CircuitBreakerParameters = Object.freeze({
  failureWindowSeconds: 300,
  failureThreshold: 3,
  initialCooldownSeconds: 300,
  backoffMultiplier: 2.0,
  maxCooldownSeconds: 3600,
  maxHalfOpenProbes: 1,
  resetSuccessThreshold: 2,
  lockoutThreshold: 5,
});

export interface CircuitBreakerStatus {
  readonly stateId: CircuitBreakerStateId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly actionType: string;
  readonly state: CircuitBreakerState;
  readonly failureCount: number;
  readonly tripCount: number;
  readonly currentCooldownSeconds: number;
  readonly lastTripTimestamp?: string;
  readonly cooldownExpiresAt?: string;
  readonly halfOpenProbesAttempted: number;
  readonly consecutiveSuccesses: number;
  readonly lockedOut: boolean;
}

// ============================================================================
// 6. REMEDIATION CANDIDATE & HANDOFF CONTRACTS
// ============================================================================
export interface RemediationCandidate {
  readonly remediationId: RemediationId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly incidentEvidenceHash: string;
  readonly diagnosisHash: string;
  readonly blastRadiusHash: string;
  readonly activePolicyHash: string;
  readonly proposedAction: RemediationActionType;
  readonly candidatePolicyDelta: Readonly<Record<string, unknown>>;
  readonly targetRuleId?: string;
  readonly recommendedPredecessorVersion?: number;
  readonly targetParameterKey?: string;
  readonly clampedLimitValue?: number | string;
  readonly justification: string;
  readonly lifecycleState: RemediationLifecycleState;
  readonly candidateHash: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface RemediationHandoffPackage {
  readonly handoffId: HandoffId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly sourceComponentId: '1204_ClosedLoopDeliberationHandoffBridge';
  readonly destinationComponentId: '1159_StrategicAdvisoryMediationRegistry';
  readonly incidentIds: readonly string[];
  readonly rootCauseDiagnosisId: RootCauseDiagnosisId;
  readonly rootCauseCategory: RootCauseCategory;
  readonly diagnosisConfidence: number;
  readonly blastRadiusRiskLevel: BlastRadiusRiskLevel;
  readonly proposedRemediationAction: RemediationActionType;
  readonly candidatePolicyDelta: Readonly<Record<string, unknown>>;
  readonly activePolicyVersion: number;
  readonly activePolicyHash: string;
  readonly remediationDossierFingerprint: string;
  readonly provenanceHash: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly nonce: string;
}

// ============================================================================
// 7. ROOT CAUSE DIAGNOSIS & CORRELATION ENVELOPE
// ============================================================================
export interface CorrelatedIncidentEnvelope {
  readonly correlationId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly incidentIds: readonly string[];
  readonly violationIds: readonly string[];
  readonly assuranceBreached: boolean;
  readonly minAssuranceScore: number;
  readonly primarySeverity: ViolationSeverity;
  readonly correlationHash: string;
}

export interface RootCauseDiagnosisRecord {
  readonly diagnosisId: RootCauseDiagnosisId;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly primaryCategory: RootCauseCategory;
  readonly confidence: number; // [0.0, 1.0]
  readonly causalEvidenceTrail: readonly string[];
  readonly activePolicyHash: string;
  readonly diagnosedRuleId?: string;
  readonly diagnosedParameter?: string;
  readonly diagnosedTimestamp: string;
  readonly diagnosisHash: string;
}

// ============================================================================
// 8. EVIDENCE DOSSIER
// ============================================================================
export interface GovernedPolicyRemediationEvidenceDossier {
  readonly dossierId: RemediationDossierId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly correlationEnvelope: CorrelatedIncidentEnvelope;
  readonly diagnosisRecord: RootCauseDiagnosisRecord;
  readonly blastRadiusRecord: PolicyBlastRadiusRiskRecord;
  readonly remediationCandidate: RemediationCandidate;
  readonly dossierFingerprint: string;
  readonly compiledAt: string;
}

// ============================================================================
// 9. AUDIT TAXONOMY (32 TYPED AUDIT EVENTS)
// ============================================================================
export type RemediationAuditEventType =
  // Evidence correlation (6)
  | 'INCIDENT_CORRELATED'
  | 'CORRELATION_SLIDING_WINDOW_EXPIRED'
  | 'CORRELATION_DUPLICATE_VIOLATION_SUPPRESSED'
  | 'CORRELATION_CROSS_DOMAIN_DETECTED'
  | 'CORRELATION_TENANT_BOUNDARY_VERIFIED'
  | 'CORRELATION_ENVELOPE_SEALED'
  // Causal diagnosis (5)
  | 'ROOT_CAUSE_DIAGNOSIS_STARTED'
  | 'ROOT_CAUSE_DIAGNOSED'
  | 'GRAPH_CYCLE_REJECTED'
  | 'DIAGNOSIS_CONFIDENCE_EVALUATED'
  | 'DIAGNOSIS_UNCERTAINTY_FLAGGED'
  // Blast radius & risk (4)
  | 'BLAST_RADIUS_EVALUATED'
  | 'ANONYMIZED_TOPOLOGY_INGESTED'
  | 'CROSS_TENANT_VIOLATION_SUPPRESSED'
  | 'CRITICAL_RISK_ESCALATED'
  // Strategy synthesis (5)
  | 'REMEDIATION_SYNTHESIS_STARTED'
  | 'REMEDIATION_CANDIDATE_GENERATED'
  | 'REMEDIATION_DIAGNOSIS_BOUND'
  | 'REMEDIATION_RISK_BOUND'
  | 'REMEDIATION_SUPERSEDED'
  // Circuit breaker (5)
  | 'CIRCUIT_BREAKER_TRIPPED_OPEN'
  | 'CIRCUIT_BREAKER_HALF_OPEN_PROBE'
  | 'CIRCUIT_BREAKER_RESET_CLOSED'
  | 'CIRCUIT_BREAKER_BACKOFF_APPLIED'
  | 'CIRCUIT_BREAKER_LOCKOUT_ENFORCED'
  // Deliberation handoff (4)
  | 'HANDOFF_PACKAGE_COMPILED'
  | 'HANDOFF_PACKAGE_TRANSMITTED'
  | 'DUPLICATE_HANDOFF_REJECTED'
  | 'HANDOFF_EXPIRED'
  // Safety & Governance (3)
  | 'EMERGENCY_STOP_ENFORCED'
  | 'TENANT_CROSSING_DETECTED'
  | 'HASH_MISMATCH_DETECTED';

export interface RemediationAuditRecord {
  readonly recordId: RemediationAuditRecordId;
  readonly sequenceNumber: number;
  readonly timestamp: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly eventType: RemediationAuditEventType;
  readonly eventPayload: Readonly<Record<string, unknown>>;
  readonly previousEventHash: string;
  readonly eventHash: string;
}

// ============================================================================
// 10. CONSTITUTIONAL INVARIANTS (IMMUTABLE BASELINE)
// ============================================================================
export const GOVERNED_POLICY_REMEDIATION_INVARIANTS = Object.freeze([
  'SOLE_HUMAN_AUTHORITY = TRUE',
  'HUMAN_AUTHORITY_COUNT = 1',
  'SECOND_HUMAN_AUTHORITY = FORBIDDEN',
  'ACTIVE_TWO_PERSON_AUTHORITY = NONE',
  'AGENT_CAPABILITY != HUMAN_AUTHORITY',
  'HUMAN_APPROVAL != AUTO_APPROVE',
  'REMEDIATION != MUTATION',
  'REMEDIATION != AUTHORIZATION',
  'REMEDIATION != RATIFICATION',
  'REMEDIATION_PROPOSAL != POLICY',
  'REMEDIATION_HASH != AUTHORIZATION',
  'AUTOMATION != REACTIVATION',
  'DIAGNOSIS != POLICY_CREATION',
  'DIAGNOSIS != EXECUTION',
  'DIAGNOSIS_CONFIDENCE != AUTHORIZATION',
  'DIAGNOSIS_CONFIDENCE != TRUTH',
  'CIRCUIT_BREAKER != PRIVILEGE_EXPANSION',
  'CIRCUIT_BREAKER != AUTHORIZATION',
  'CIRCUIT_BREAKER != POLICY_MUTATION',
  'CIRCUIT_BREAKER != EXECUTION',
  'OBSERVATION != DECISION',
  'DECISION != AUTHORIZATION',
  'AUTHORIZATION != MUTATION',
  'HASH != AUTHORIZATION',
  'EVIDENCE != AUTHORIZATION',
  'ASSURANCE_SCORE != AUTHORIZATION',
  'COMPLIANCE_RESULT != AUTHORIZATION',
  'RISK_SCORE != AUTHORIZATION',
  'CROSS_TENANT_RISK_VISIBILITY != CROSS_TENANT_DATA_ACCESS',
  'CROSS_TENANT_RISK_VISIBILITY != CROSS_TENANT_MUTATION',
  'HANDOFF != DELIBERATION',
  'DELIBERATION != APPROVAL',
  'APPROVAL != RATIFICATION',
  'RATIFICATION != EXECUTION',
  'ROLLBACK != POLICY_CREATION',
  'ROLLBACK != AUTHORITY_ESCALATION',
  'EMERGENCY_STOP > GOVERNANCE',
  'EMERGENCY_STOP > REMEDIATION',
  'EMERGENCY_STOP > CIRCUIT_BREAKER',
  'EMERGENCY_STOP > RUNTIME_COMPLIANCE',
  'STORE_REFERENCE != MUTATION_AUTHORITY',
  'RETIRED_IS_TERMINAL',
  'TENANT_BOUNDARY_STRICT',
]);

export const GENESIS_REMEDIATION_HASH = '0'.repeat(64);

// ============================================================================
// 11. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicyRemediationBaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GovernedPolicyRemediationBaseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RemediationAuthorityViolationError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[RemediationAuthorityViolationError] ${message}`);
    this.name = 'RemediationAuthorityViolationError';
  }
}

export class CrossTenantAccessForbiddenError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[CrossTenantAccessForbiddenError] ${message}`);
    this.name = 'CrossTenantAccessForbiddenError';
  }
}

export class CircuitBreakerOpenError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[CircuitBreakerOpenError] ${message}`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreakerLockoutError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[CircuitBreakerLockoutError] ${message}`);
    this.name = 'CircuitBreakerLockoutError';
  }
}

export class DuplicateRemediationHandoffError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[DuplicateRemediationHandoffError] ${message}`);
    this.name = 'DuplicateRemediationHandoffError';
  }
}

export class ExpiredRemediationHandoffError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[ExpiredRemediationHandoffError] ${message}`);
    this.name = 'ExpiredRemediationHandoffError';
  }
}

export class DeterministicDiagnosisError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[DeterministicDiagnosisError] ${message}`);
    this.name = 'DeterministicDiagnosisError';
  }
}

export class RemediationEvidenceError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[RemediationEvidenceError] ${message}`);
    this.name = 'RemediationEvidenceError';
  }
}

export class RemediationAuditLedgerError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[RemediationAuditLedgerError] ${message}`);
    this.name = 'RemediationAuditLedgerError';
  }
}

export class EmergencyStopActiveError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[EmergencyStopActiveError] ${message}`);
    this.name = 'EmergencyStopActiveError';
  }
}

export class SecondaryAuthorityRejectedError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[SecondaryAuthorityRejectedError] ${message}`);
    this.name = 'SecondaryAuthorityRejectedError';
  }
}

export class UntrustedInputSanitizationError extends GovernedPolicyRemediationBaseError {
  constructor(message: string) {
    super(`[UntrustedInputSanitizationError] ${message}`);
    this.name = 'UntrustedInputSanitizationError';
  }
}

// ============================================================================
// 12. DETERMINISTIC SERIALIZATION & SHA-256 HASH HELPERS
// ============================================================================
export function canonicalJsonSerialize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJsonSerialize(item)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (key) => JSON.stringify(key) + ':' + canonicalJsonSerialize((obj as Record<string, unknown>)[key])
  );
  return '{' + pairs.join(',') + '}';
}

export function computeSha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function computeCorrelationHash(data: {
  tenantId: string;
  policyDomain: PolicyDomain;
  incidentIds: readonly string[];
  violationIds: readonly string[];
  windowStart: string;
  windowEnd: string;
}): string {
  return computeSha256(canonicalJsonSerialize(data));
}

export function computeDiagnosisHash(data: {
  correlationId: string;
  tenantId: string;
  policyDomain: PolicyDomain;
  primaryCategory: RootCauseCategory;
  confidence: number;
  activePolicyHash: string;
  causalEvidenceTrail: readonly string[];
}): string {
  return computeSha256(canonicalJsonSerialize(data));
}

export function computeBlastRadiusHash(data: {
  tenantId: string;
  policyDomain: PolicyDomain;
  rootCauseDiagnosisId: string;
  riskScore: number;
  riskLevel: BlastRadiusRiskLevel;
  impactedWorkflowsCount: number;
}): string {
  return computeSha256(canonicalJsonSerialize(data));
}

export function computeCandidateRemediationHash(data: {
  tenantId: string;
  policyDomain: PolicyDomain;
  incidentEvidenceHash: string;
  diagnosisHash: string;
  blastRadiusHash: string;
  activePolicyHash: string;
  proposedAction: RemediationActionType;
  candidatePolicyDelta: Readonly<Record<string, unknown>>;
  lifecycleState: RemediationLifecycleState;
}): string {
  return computeSha256(canonicalJsonSerialize(data));
}

export function computeEvidenceDossierFingerprint(data: {
  tenantId: string;
  policyDomain: PolicyDomain;
  correlationHash: string;
  diagnosisHash: string;
  blastRadiusHash: string;
  candidateHash: string;
}): string {
  return computeSha256(canonicalJsonSerialize(data));
}

export function computeAuditEventHash(
  sequenceNumber: number,
  timestamp: string,
  tenantId: string,
  policyDomain: PolicyDomain,
  eventType: RemediationAuditEventType,
  eventPayload: Readonly<Record<string, unknown>>,
  previousEventHash: string
): string {
  const payload = {
    sequenceNumber,
    timestamp,
    tenantId,
    policyDomain,
    eventType,
    eventPayload,
    previousEventHash,
  };
  return computeSha256(canonicalJsonSerialize(payload));
}
