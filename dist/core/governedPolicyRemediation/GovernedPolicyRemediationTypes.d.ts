import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { ViolationSeverity } from '../governedRuntimeCompliance/GovernedRuntimeComplianceTypes.js';
export type RemediationId = string & {
    readonly __brand: unique symbol;
};
export type RootCauseDiagnosisId = string & {
    readonly __brand: unique symbol;
};
export type CircuitBreakerStateId = string & {
    readonly __brand: unique symbol;
};
export type RemediationDossierId = string & {
    readonly __brand: unique symbol;
};
export type RemediationAuditRecordId = string & {
    readonly __brand: unique symbol;
};
export type HandoffId = string & {
    readonly __brand: unique symbol;
};
export interface EmergencyStopProvider {
    isEmergencyStopActive(): boolean;
}
export declare function asRemediationId(id: string): RemediationId;
export declare function asRootCauseDiagnosisId(id: string): RootCauseDiagnosisId;
export declare function asCircuitBreakerStateId(id: string): CircuitBreakerStateId;
export declare function asRemediationDossierId(id: string): RemediationDossierId;
export declare function asRemediationAuditRecordId(id: string): RemediationAuditRecordId;
export declare function asHandoffId(id: string): HandoffId;
export type RootCauseCategory = 'RULE_OVER_RESTRICTION' | 'PARAMETER_LIMIT_MISMATCH' | 'BEHAVIORAL_DRIFT_CASCADE' | 'CROSS_DOMAIN_INVARIANT_CONFLICT' | 'LIFECYCLE_STATE_TIMING_RACE' | 'ENVIRONMENTAL_PRECONDITION_COLLAPSE' | 'AUTHORIZATION_TOKEN_EXHAUSTION' | 'TEMPORAL_CLOCK_DESYNCHRONIZATION' | 'TENANT_DOMAIN_MISALLOCATION' | 'UNKNOWN_ANOMALOUS_MUTATION';
export declare const ALL_ROOT_CAUSE_CATEGORIES: readonly RootCauseCategory[];
export type RemediationActionType = 'AMEND_POLICY_RULE' | 'CLAMP_PARAMETER_LIMIT' | 'ROLLBACK_POLICY_VERSION' | 'QUARANTINE_ACTION';
export type RemediationLifecycleState = 'GENERATED' | 'DIAGNOSIS_BOUND' | 'RISK_BOUND' | 'REVIEW_PENDING' | 'HANDED_OFF' | 'REVIEWED' | 'SUPERSEDED' | 'REJECTED' | 'EXPIRED';
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
    readonly riskScore: number;
    readonly riskLevel: BlastRadiusRiskLevel;
    readonly impactedWorkflowsCount: number;
    readonly crossDomainRippleDetected: boolean;
    readonly anonymizedTopologySummary?: AnonymizedDependencyTopology;
    readonly analysisTimestamp: string;
    readonly blastRadiusHash: string;
}
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerParameters {
    readonly failureWindowSeconds: number;
    readonly failureThreshold: number;
    readonly initialCooldownSeconds: number;
    readonly backoffMultiplier: number;
    readonly maxCooldownSeconds: number;
    readonly maxHalfOpenProbes: number;
    readonly resetSuccessThreshold: number;
    readonly lockoutThreshold: number;
}
export declare const DEFAULT_CIRCUIT_BREAKER_PARAMS: CircuitBreakerParameters;
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
    readonly confidence: number;
    readonly causalEvidenceTrail: readonly string[];
    readonly activePolicyHash: string;
    readonly diagnosedRuleId?: string;
    readonly diagnosedParameter?: string;
    readonly diagnosedTimestamp: string;
    readonly diagnosisHash: string;
}
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
export type RemediationAuditEventType = 'INCIDENT_CORRELATED' | 'CORRELATION_SLIDING_WINDOW_EXPIRED' | 'CORRELATION_DUPLICATE_VIOLATION_SUPPRESSED' | 'CORRELATION_CROSS_DOMAIN_DETECTED' | 'CORRELATION_TENANT_BOUNDARY_VERIFIED' | 'CORRELATION_ENVELOPE_SEALED' | 'ROOT_CAUSE_DIAGNOSIS_STARTED' | 'ROOT_CAUSE_DIAGNOSED' | 'GRAPH_CYCLE_REJECTED' | 'DIAGNOSIS_CONFIDENCE_EVALUATED' | 'DIAGNOSIS_UNCERTAINTY_FLAGGED' | 'BLAST_RADIUS_EVALUATED' | 'ANONYMIZED_TOPOLOGY_INGESTED' | 'CROSS_TENANT_VIOLATION_SUPPRESSED' | 'CRITICAL_RISK_ESCALATED' | 'REMEDIATION_SYNTHESIS_STARTED' | 'REMEDIATION_CANDIDATE_GENERATED' | 'REMEDIATION_DIAGNOSIS_BOUND' | 'REMEDIATION_RISK_BOUND' | 'REMEDIATION_SUPERSEDED' | 'CIRCUIT_BREAKER_TRIPPED_OPEN' | 'CIRCUIT_BREAKER_HALF_OPEN_PROBE' | 'CIRCUIT_BREAKER_RESET_CLOSED' | 'CIRCUIT_BREAKER_BACKOFF_APPLIED' | 'CIRCUIT_BREAKER_LOCKOUT_ENFORCED' | 'HANDOFF_PACKAGE_COMPILED' | 'HANDOFF_PACKAGE_TRANSMITTED' | 'DUPLICATE_HANDOFF_REJECTED' | 'HANDOFF_EXPIRED' | 'EMERGENCY_STOP_ENFORCED' | 'TENANT_CROSSING_DETECTED' | 'HASH_MISMATCH_DETECTED';
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
export declare const GOVERNED_POLICY_REMEDIATION_INVARIANTS: readonly string[];
export declare const GENESIS_REMEDIATION_HASH: string;
export declare class GovernedPolicyRemediationBaseError extends Error {
    constructor(message: string);
}
export declare class RemediationAuthorityViolationError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class CrossTenantAccessForbiddenError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class CircuitBreakerOpenError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class CircuitBreakerLockoutError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class DuplicateRemediationHandoffError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class ExpiredRemediationHandoffError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class DeterministicDiagnosisError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class RemediationEvidenceError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class RemediationAuditLedgerError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class EmergencyStopActiveError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class SecondaryAuthorityRejectedError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare class UntrustedInputSanitizationError extends GovernedPolicyRemediationBaseError {
    constructor(message: string);
}
export declare function canonicalJsonSerialize(obj: unknown): string;
export declare function computeSha256(data: string): string;
export declare function computeCorrelationHash(data: {
    tenantId: string;
    policyDomain: PolicyDomain;
    incidentIds: readonly string[];
    violationIds: readonly string[];
    windowStart: string;
    windowEnd: string;
}): string;
export declare function computeDiagnosisHash(data: {
    correlationId: string;
    tenantId: string;
    policyDomain: PolicyDomain;
    primaryCategory: RootCauseCategory;
    confidence: number;
    activePolicyHash: string;
    causalEvidenceTrail: readonly string[];
}): string;
export declare function computeBlastRadiusHash(data: {
    tenantId: string;
    policyDomain: PolicyDomain;
    rootCauseDiagnosisId: string;
    riskScore: number;
    riskLevel: BlastRadiusRiskLevel;
    impactedWorkflowsCount: number;
}): string;
export declare function computeCandidateRemediationHash(data: {
    tenantId: string;
    policyDomain: PolicyDomain;
    incidentEvidenceHash: string;
    diagnosisHash: string;
    blastRadiusHash: string;
    activePolicyHash: string;
    proposedAction: RemediationActionType;
    candidatePolicyDelta: Readonly<Record<string, unknown>>;
    lifecycleState: RemediationLifecycleState;
}): string;
export declare function computeEvidenceDossierFingerprint(data: {
    tenantId: string;
    policyDomain: PolicyDomain;
    correlationHash: string;
    diagnosisHash: string;
    blastRadiusHash: string;
    candidateHash: string;
}): string;
export declare function computeAuditEventHash(sequenceNumber: number, timestamp: string, tenantId: string, policyDomain: PolicyDomain, eventType: RemediationAuditEventType, eventPayload: Readonly<Record<string, unknown>>, previousEventHash: string): string;
