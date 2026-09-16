import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export type SimulationSessionId = string & {
    readonly __brand: unique symbol;
};
export type CounterfactualEvaluationId = string & {
    readonly __brand: unique symbol;
};
export type ShadowRunId = string & {
    readonly __brand: unique symbol;
};
export type SimulationDossierId = string & {
    readonly __brand: unique symbol;
};
export type SimulationAuditRecordId = string & {
    readonly __brand: unique symbol;
};
export type SimulationHandoffId = string & {
    readonly __brand: unique symbol;
};
export interface EmergencyStopProvider {
    isEmergencyStopActive(): boolean;
}
export declare function asSimulationSessionId(id: string): SimulationSessionId;
export declare function asCounterfactualEvaluationId(id: string): CounterfactualEvaluationId;
export declare function asShadowRunId(id: string): ShadowRunId;
export declare function asSimulationDossierId(id: string): SimulationDossierId;
export declare function asSimulationAuditRecordId(id: string): SimulationAuditRecordId;
export declare function asSimulationHandoffId(id: string): SimulationHandoffId;
export type SimulationMode = 'HISTORICAL_REPLAY' | 'COUNTERFACTUAL_PROJECTION' | 'INVARIANT_ANALYSIS' | 'SYNTHETIC_STRESS' | 'SHADOW_DUAL_EVAL' | 'FULL_PIPELINE';
export type SimulationVerdict = 'STABLE' | 'REGRESSIVE' | 'DEADLOCK_DETECTED' | 'INSUFFICIENT_EVIDENCE' | 'HIGH_REGRESSION_RISK' | 'PROJECTION_VALIDATED';
export type SimulationSessionState = 'INITIATED' | 'REPLAYING' | 'PROJECTING' | 'INVARIANT_CHECKING' | 'STRESS_TESTING' | 'SHADOW_EVALUATING' | 'DOSSIER_COMPILED' | 'HANDED_OFF' | 'REPLAY_FAILED' | 'PROJECTION_FAILED' | 'DEADLOCK_TERMINATED' | 'STRESS_FAILED' | 'EXPIRED' | 'SUPERSEDED';
/**
 * Historical observation item used as replay corpus input
 */
export interface HistoricalObservationItem {
    readonly observationId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly actionType: string;
    readonly parameters: Readonly<Record<string, unknown>>;
    readonly timestamp: number;
    readonly wasCompliant: boolean;
    readonly violationDetails?: Readonly<Record<string, unknown>>;
}
/**
 * Result of historical execution replay
 */
export interface ReplayExecutionResult {
    readonly totalReplayed: number;
    readonly newlyDeniedCount: number;
    readonly newlyPermittedCount: number;
    readonly unchangedCount: number;
    readonly falseRejectionCount: number;
    readonly trueMitigationCount: number;
    readonly corpusHash: string;
    readonly replayedAt: number;
}
/**
 * Counterfactual operational assurance projection
 */
export interface CounterfactualAssuranceProjection {
    readonly baselineAssurance: number;
    readonly projectedAssurance: number;
    readonly assuranceDelta: number;
    readonly falsePositiveRejectionRate: number;
    readonly isHighRegressionRisk: boolean;
    readonly projectionHash: string;
    readonly calculatedAt: number;
}
/**
 * Directed edge representing policy rule dependency
 */
export interface PolicyDomainDependency {
    readonly sourceDomain: PolicyDomain;
    readonly targetDomain: PolicyDomain;
    readonly constraintName: string;
    readonly prerequisiteRuleId: string;
}
/**
 * Result of cross-domain invariant and deadlock check
 */
export interface CrossDomainInvariantResult {
    readonly hasDeadlock: boolean;
    readonly circularDependencies: readonly (readonly string[])[];
    readonly conflictingRules: readonly string[];
    readonly invariantCheckHash: string;
    readonly checkedAt: number;
}
/**
 * Synthetic stress test input parameters
 */
export interface SyntheticStressConfig {
    readonly iterationCount: number;
    readonly simulateRateBurst: boolean;
    readonly simulateResourceCeiling: boolean;
    readonly simulateMalformedPayload: boolean;
    readonly recursionDepthLimit?: number;
    readonly timeoutMs?: number;
}
/**
 * Result of synthetic stress test harness
 */
export interface SyntheticStressResult {
    readonly totalProbes: number;
    readonly passedProbes: number;
    readonly failedProbes: number;
    readonly boundaryBreakages: readonly string[];
    readonly stressHash: string;
    readonly executedAt: number;
}
/**
 * Live shadow dual-evaluation tap record
 */
export interface ShadowEvaluationRecord {
    readonly shadowRunId: ShadowRunId;
    readonly observationId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly activePolicyDecision: 'ALLOW' | 'DENY';
    readonly shadowCandidateDecision: 'ALLOW' | 'DENY';
    readonly isDivergent: boolean;
    readonly divergenceReason?: string;
    readonly evaluatedAt: number;
}
/**
 * Compiled simulation evidence dossier
 */
export interface PolicySimulationEvidenceDossier {
    readonly dossierId: SimulationDossierId;
    readonly sessionId: SimulationSessionId;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly candidatePolicyHash: string;
    readonly basePolicyHash: string;
    readonly replayResult: ReplayExecutionResult;
    readonly assuranceProjection: CounterfactualAssuranceProjection;
    readonly invariantResult: CrossDomainInvariantResult;
    readonly stressResult: SyntheticStressResult;
    readonly shadowSummary: {
        readonly totalShadowEvaluations: number;
        readonly totalDivergences: number;
    };
    readonly overallVerdict: SimulationVerdict;
    readonly simulationDossierFingerprint: string;
    readonly compiledAt: number;
    readonly expiresAt: number;
}
/**
 * Handoff package delivered to MS-1.5.19 Deliberation Gateway
 */
export interface SimulationAdvisoryPackage {
    readonly handoffId: SimulationHandoffId;
    readonly dossierId: SimulationDossierId;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly candidatePolicyHash: string;
    readonly basePolicyHash: string;
    readonly overallVerdict: SimulationVerdict;
    readonly assuranceDelta: number;
    readonly falseRejectionRate: number;
    readonly isHighRegressionRisk: boolean;
    readonly dossierFingerprint: string;
    readonly handoffNonce: string;
    readonly packagedAt: number;
    readonly expiresAt: number;
}
export type SimulationAuditEventType = 'SIMULATION_SESSION_INITIATED' | 'HISTORICAL_REPLAY_STARTED' | 'HISTORICAL_REPLAY_COMPLETED' | 'HISTORICAL_REPLAY_FAILED' | 'ASSURANCE_PROJECTION_STARTED' | 'ASSURANCE_PROJECTION_COMPLETED' | 'ASSURANCE_PROJECTION_FAILED' | 'HIGH_REGRESSION_RISK_FLAGGED' | 'INVARIANT_CHECK_STARTED' | 'INVARIANT_CHECK_PASSED' | 'CROSS_DOMAIN_DEADLOCK_DETECTED' | 'INVARIANT_CHECK_FAILED' | 'SYNTHETIC_STRESS_STARTED' | 'SYNTHETIC_STRESS_COMPLETED' | 'SYNTHETIC_STRESS_FAILED' | 'SHADOW_TAP_REGISTERED' | 'SHADOW_TAP_EVALUATED' | 'SHADOW_DIVERGENCE_DETECTED' | 'SIMULATION_DOSSIER_COMPILED' | 'SIMULATION_DOSSIER_PERSISTED' | 'SIMULATION_DOSSIER_FROZEN' | 'SIMULATION_HANDOFF_PREPARED' | 'SIMULATION_HANDOFF_TRANSMITTED' | 'SIMULATION_HANDOFF_EXPIRED' | 'SIMULATION_HANDOFF_DUPLICATE_REJECTED' | 'EMERGENCY_STOP_ENCOUNTERED' | 'CROSS_TENANT_ACCESS_PREVENTED' | 'PROMPT_INJECTION_SANITIZED' | 'AUDIT_LEDGER_INTEGRITY_VERIFIED' | 'AUDIT_LEDGER_CHAIN_CORRUPTED' | 'SIMULATION_PIPELINE_SUCCEEDED' | 'SIMULATION_PIPELINE_FAILED';
export interface SimulationAuditRecord {
    readonly recordId: SimulationAuditRecordId;
    readonly eventType: SimulationAuditEventType;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly sessionId?: SimulationSessionId;
    readonly details: Readonly<Record<string, unknown>>;
    readonly previousEventHash: string;
    readonly eventHash: string;
    readonly timestamp: number;
}
export declare const GENESIS_SIMULATION_HASH: string;
export declare const MAX_HANDOFF_TTL_MS = 86400000;
export declare const DEFAULT_SIMULATION_DOSSIER_TTL_MS: number;
export declare const DEFAULT_FALSE_REJECTION_THRESHOLD = 0.05;
export declare const MAX_LOCK_TIMEOUT_MS = 5000;
export declare const GOVERNED_POLICY_SIMULATION_INVARIANTS: Readonly<{
    SOLE_HUMAN_AUTHORITY: true;
    HUMAN_AUTHORITY_COUNT: 1;
    SECOND_HUMAN_AUTHORITY: false;
    ACTIVE_TWO_PERSON_AUTHORITY: "NONE";
    AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: true;
    HUMAN_APPROVAL_NOT_AUTO_APPROVE: true;
    SIMULATION_NOT_RATIFICATION: true;
    SIMULATION_NOT_ACTIVATION: true;
    SIMULATION_NOT_MUTATION: true;
    SIMULATION_NOT_AUTHORIZATION: true;
    SIMULATION_RESULT_NOT_APPROVAL: true;
    SIMULATION_SCORE_NOT_AUTHORITY: true;
    SHADOW_VERDICT_NOT_PDP_DECISION: true;
    SHADOW_NOT_LIVE_EXECUTION: true;
    SHADOW_NOT_CANARY: true;
    REPLAY_NOT_ACTUATION: true;
    COUNTERFACTUAL_NOT_FACTUAL: true;
    HASH_NOT_AUTHORIZATION: true;
    EMERGENCY_STOP_DOMINATES: true;
    TENANT_BOUNDARY_STRICT: true;
}>;
export declare class GovernedPolicySimulationBaseError extends Error {
    constructor(message: string);
}
export declare class SimulationAuthorityViolationError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationCrossTenantAccessForbiddenError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationDeadlockDetectedError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationReplayCorpusCorruptedError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationEmergencyStopActiveError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationSecondaryAuthorityRejectedError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationAuditLedgerIntegrityError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationHandoffExpiredError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class DuplicateSimulationHandoffError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationUntrustedInputSanitizationError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export declare class SimulationLockTimeoutError extends GovernedPolicySimulationBaseError {
    constructor(message: string);
}
export { SimulationEmergencyStopActiveError as EmergencyStopActiveError, SimulationCrossTenantAccessForbiddenError as CrossTenantAccessForbiddenError, };
export declare function canonicalJsonSerialize(value: unknown): string;
export declare function computeSha256(data: string): string;
export declare function computeReplayCorpusHash(corpus: readonly HistoricalObservationItem[]): string;
export declare function computeCandidatePolicyHash(deltas: readonly PolicyDelta[], basePolicyHash: string): string;
export declare function computeProjectionHash(projection: {
    readonly baselineAssurance: number;
    readonly projectedAssurance: number;
    readonly assuranceDelta: number;
    readonly falsePositiveRejectionRate: number;
}): string;
export declare function computeInvariantCheckHash(result: {
    readonly hasDeadlock: boolean;
    readonly circularDependencies: readonly (readonly string[])[];
    readonly conflictingRules: readonly string[];
}): string;
export declare function computeStressHash(result: {
    readonly totalProbes: number;
    readonly passedProbes: number;
    readonly failedProbes: number;
    readonly boundaryBreakages: readonly string[];
}): string;
export declare function computeSimulationDossierFingerprint(dossierPayload: Record<string, unknown>): string;
export declare function computeAuditEventHash(previousEventHash: string, eventData: Record<string, unknown>): string;
export declare function sanitizeUntrustedText(text: string, maxLength?: number): string;
