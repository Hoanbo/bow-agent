export type Phase14CriterionId = 'CRIT-1.4-01' | 'CRIT-1.4-02' | 'CRIT-1.4-03' | 'CRIT-1.4-04' | 'CRIT-1.4-05' | 'CRIT-1.4-06' | 'CRIT-1.4-07' | 'CRIT-1.4-08' | 'CRIT-1.4-09' | 'CRIT-1.4-10' | 'CRIT-1.4-11' | 'CRIT-1.4-12';
export type Phase14CriterionStatus = 'PASSED' | 'FAILED' | 'INSUFFICIENT_EVIDENCE';
export type Phase14OverallReadinessStatus = 'READY_FOR_PHASE_EXIT' | 'NOT_READY' | 'ASSESSMENT_ABORTED';
export type Phase14ChaosFaultType = 'NETWORK_TIMEOUT' | 'MODEL_CIRCUIT_BREAK' | 'PDP_DENIAL' | 'VERIFICATION_FAILURE' | 'COMMIT_CONFLICT' | 'USER_STOP_PREEMPTION';
/**
 * Detailed Evaluation of a Single Exit Criterion
 */
export interface Phase14CriterionEvaluation {
    readonly criterionId: Phase14CriterionId;
    readonly name: string;
    readonly status: Phase14CriterionStatus;
    readonly score: number;
    readonly description: string;
    readonly empiricalEvidence: Readonly<Record<string, unknown>>;
    readonly evaluatedAtIso: string;
}
/**
 * Result of a Chaos Fault Injection Scenario
 */
export interface Phase14ChaosScenarioResult {
    readonly scenarioId: string;
    readonly faultType: Phase14ChaosFaultType;
    readonly targetSubsystem: string;
    readonly injected: boolean;
    readonly agentHandledSafely: boolean;
    readonly recoveredOrTerminatedCleanly: boolean;
    readonly zeroStatePollution: boolean;
    readonly observedBehavior: string;
    readonly durationMs: number;
}
/**
 * Cryptographic Provenance Chain Linking MS-1.4.01 through MS-1.4.11
 */
export interface Phase14ProvenanceManifest {
    readonly ms1401TaskLifecycleHash: string;
    readonly ms1402CognitiveHash: string;
    readonly ms1403ContextHash: string;
    readonly ms1404PlanningHash: string;
    readonly ms1405ActionProposalHash: string;
    readonly ms1406ToolAdapterHash: string;
    readonly ms1407RealityVerificationHash: string;
    readonly ms1408DurableCommitHash: string;
    readonly ms1409EpisodicMemoryHash: string;
    readonly ms1410AgentLoopFacadeHash: string;
    readonly ms1411ObservabilityHash: string;
    readonly compositeManifestHash: string;
}
/**
 * Master Phase 1.4 Readiness Report Contract
 */
export interface Phase14ReadinessReport {
    readonly reportId: string;
    readonly tenantId: string;
    readonly assessedAtIso: string;
    readonly overallStatus: Phase14OverallReadinessStatus;
    readonly passRatio: number;
    readonly criteriaPassedCount: number;
    readonly criteriaEvaluations: readonly Phase14CriterionEvaluation[];
    readonly chaosScenarios: readonly Phase14ChaosScenarioResult[];
    readonly provenanceManifest: Phase14ProvenanceManifest;
    readonly summaryNotes: string;
}
/**
 * Runtime Result Envelope
 */
export interface Phase14ReadinessResult {
    readonly success: boolean;
    readonly report: Phase14ReadinessReport;
    readonly error?: {
        readonly code: string;
        readonly message: string;
    } | null;
}
/**
 * Canonical Constants for Phase 1.4 Criteria
 */
export declare const PHASE14_CRITERIA_DEFINITIONS: Readonly<Record<Phase14CriterionId, {
    name: string;
    description: string;
}>>;
/**
 * Typed Error Taxonomy
 */
export declare class Phase14ReadinessError extends Error {
    readonly code: string;
    constructor(message: string, code?: string);
}
export declare class Phase14ReadinessAbortedError extends Phase14ReadinessError {
    readonly reason: string;
    constructor(reason: string);
}
export declare class Phase14ValidationError extends Phase14ReadinessError {
    constructor(message: string);
}
export declare class Phase14SecurityError extends Phase14ReadinessError {
    constructor(message: string);
}
export declare class Phase14ConcurrencyError extends Phase14ReadinessError {
    constructor(message: string);
}
/**
 * Deeply freeze an object recursively to guarantee immutability
 */
export declare function deepFreeze<T>(obj: T): T;
