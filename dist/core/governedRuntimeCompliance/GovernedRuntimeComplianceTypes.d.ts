import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyLifecycleState } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
export type RuntimeObservationId = string & {
    readonly __brand: unique symbol;
};
export type ComplianceEvaluationId = string & {
    readonly __brand: unique symbol;
};
export type AssuranceScoreId = string & {
    readonly __brand: unique symbol;
};
export type ComplianceDossierId = string & {
    readonly __brand: unique symbol;
};
export type RuntimeComplianceAuditRecordId = string & {
    readonly __brand: unique symbol;
};
export type RuntimeActionClassification = 'OBSERVE' | 'RECOMMEND' | 'REVERSIBLE' | 'HIGH_IMPACT' | 'FORBIDDEN';
export type RuntimeComplianceVerdict = 'COMPLIANT' | 'NON_COMPLIANT' | 'DIVERGENT' | 'ANOMALOUS';
export type PolicyViolationCategory = 'AUTHORIZATION_VIOLATION' | 'POLICY_RULE_VIOLATION' | 'TENANT_BOUNDARY_VIOLATION' | 'LIFECYCLE_STATE_VIOLATION' | 'SAFETY_INTERLOCK_VIOLATION' | 'BEHAVIORAL_DRIFT' | 'TEMPORAL_ORDER_VIOLATION' | 'REPEATED_NONCOMPLIANCE';
export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AssuranceState = 'ASSURED_COMPLIANT' | 'ASSURED_DEGRADED' | 'ASSURED_BREACHED';
export declare const ASSURANCE_THRESHOLD_COMPLIANT = 0.95;
export declare const ASSURANCE_THRESHOLD_DEGRADED = 0.85;
export declare const WEIGHT_COMPLIANCE_RATIO = 0.5;
export declare const WEIGHT_VIOLATION_PENALTY = 0.3;
export declare const WEIGHT_DRIFT_MAGNITUDE = 0.15;
export declare const WEIGHT_OBSERVATION_FRESHNESS = 0.05;
export declare const FRESHNESS_DECAY_HALF_LIFE_SEC = 1800;
export declare const MAX_SLIDING_WINDOW_OBSERVATIONS = 100;
export declare const MAX_SLIDING_WINDOW_DURATION_SEC = 3600;
export declare const MAX_CLOCK_SKEW_TOLERANCE_MS = 60000;
export declare const MAX_AUDIT_BATCH_SIZE = 100;
export declare const GENESIS_PREV_HASH: string;
export declare const SEVERITY_WEIGHT_TABLE: Readonly<Record<ViolationSeverity, number>>;
export declare const MAX_SEVERITY_WEIGHT = 10;
export declare const GOVERNED_RUNTIME_COMPLIANCE_INVARIANTS: readonly string[];
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
    readonly scoreValue: number;
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
    readonly cumulativeMagnitude: number;
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
export type RuntimeComplianceAuditEventType = 'OBSERVATION_INGESTED' | 'OBSERVATION_SANITIZED' | 'OBSERVATION_REPLAY_REJECTED' | 'OBSERVATION_RATE_LIMITED' | 'POLICY_BINDING_RESOLVED' | 'POLICY_BINDING_FAILED' | 'POLICY_VERSION_MISMATCH' | 'POLICY_HASH_MISMATCH' | 'COMPLIANCE_EVALUATION_STARTED' | 'COMPLIANCE_EVALUATED_COMPLIANT' | 'COMPLIANCE_EVALUATED_NON_COMPLIANT' | 'COMPLIANCE_EVALUATED_DIVERGENT' | 'COMPLIANCE_EVALUATED_ANOMALOUS' | 'VIOLATION_DETECTED_CRITICAL' | 'VIOLATION_DETECTED_HIGH' | 'VIOLATION_DETECTED_MEDIUM' | 'VIOLATION_DETECTED_LOW' | 'BEHAVIORAL_DRIFT_EVALUATED' | 'BEHAVIORAL_DRIFT_ACCELERATED' | 'ASSURANCE_SCORE_COMPUTED' | 'ASSURANCE_THRESHOLD_BREACHED' | 'SAFETY_CONTAINMENT_FLAGGED' | 'SAFETY_DEGRADATION_TRIGGERED' | 'SAFETY_SUSPENSION_TRIGGERED' | 'AUTOMATION_REACTIVATION_BLOCKED' | 'EMERGENCY_STOP_ENFORCED' | 'TENANT_BOUNDARY_BREACH_REJECTED' | 'TEMPORAL_CLOCK_SKEW_REJECTED' | 'EVIDENCE_DOSSIER_COMPILED' | 'AUDIT_LEDGER_APPENDED' | 'AUDIT_LEDGER_CHAIN_VERIFIED' | 'AUDIT_LEDGER_CORRUPTION_DETECTED';
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
export declare function canonicalJsonStringify(obj: unknown): string;
export declare function computeSha256(content: string): string;
export declare function computeObservationHash(profile: RuntimeBehavioralProfile): string;
export declare function computeEvaluationHash(record: ComplianceEvaluationRecord): string;
export declare function computeAssuranceHash(score: OperationalAssuranceScore): string;
export declare function computeDossierFingerprint(dossierWithoutFingerprint: Omit<RuntimeComplianceEvidenceDossier, 'sha256Fingerprint'>): string;
export declare function computeAuditEventHash(prevHash: string, eventWithoutHashes: Omit<RuntimeComplianceAuditEvent, 'eventHash' | 'payloadHash' | 'prevHash'>, payload: Record<string, unknown>): {
    payloadHash: string;
    eventHash: string;
};
export declare class RuntimeComplianceError extends Error {
    constructor(message: string);
}
export declare class ObservationSanitizationError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class PolicyVersionBindingMismatchError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class PolicySnapshotUnavailableError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class TemporalClockSkewError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class ObservationSequenceError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class ObservationReplayError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class DeterministicEvaluationError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class AssuranceScoringError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class PolicyViolationDetectedError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class AdaptiveSafetyControlError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class AutomatedReactivationForbiddenError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class TenantAccessForbiddenError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class RuntimeComplianceAuditLedgerError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class EmergencyStopActiveError extends RuntimeComplianceError {
    constructor(message: string);
}
export declare class SecondaryAuthorityRejectedError extends RuntimeComplianceError {
    constructor(message: string);
}
