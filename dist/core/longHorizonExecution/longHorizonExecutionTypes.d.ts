export declare const LONG_HORIZON_SCHEMA_VERSION = "4.0.0";
export declare const MAX_LONG_HORIZON_GENERATIONS = 10;
export declare const MAX_LONG_HORIZON_STEPS = 100;
export declare const MAX_REPLANNING_ATTEMPTS = 10;
export declare const MAX_EXECUTION_ATTEMPTS_PER_STEP = 3;
export declare const MAX_CONSECUTIVE_FAILURES = 3;
export declare const MAX_STAGNATION_CYCLES = 3;
export declare const MAX_OBJECTIVE_EXTENSIONS = 3;
export declare const MAX_PENDING_APPROVALS = 1;
export declare const MAX_WALL_CLOCK_MS: number;
export type LongHorizonState = 'INITIALIZING' | 'AUTHORIZED' | 'READY' | 'EXECUTING' | 'EVALUATING_PROGRESS' | 'ENVIRONMENT_CHECK' | 'REPLANNING_REQUIRED' | 'AWAITING_AUTHORIZATION_REFRESH' | 'AWAITING_HUMAN_CONFIRMATION' | 'PAUSED' | 'RESUMING' | 'COMPLETED' | 'FAILED' | 'BUDGET_EXHAUSTED' | 'STAGNATED' | 'ABORTED' | 'INVALIDATED' | 'EXPIRED' | 'RECOVERY_REQUIRED' | 'TERMINATED';
export type ProgressClassification = 'PROGRESS' | 'NO_PROGRESS' | 'PARTIAL_PROGRESS' | 'REGRESSION' | 'UNKNOWN' | 'SUCCESS' | 'FAILURE' | 'INVALIDATED';
export interface LongHorizonAutonomyBudget {
    readonly maxGenerations: number;
    readonly maxSteps: number;
    readonly maxReplanningAttempts: number;
    readonly maxExecutionAttempts: number;
    readonly maxExecutionAttemptsPerStep: number;
    readonly maxConsecutiveFailures: number;
    readonly maxStagnationCycles: number;
    readonly maxObjectiveExtensions: number;
    readonly maxPendingApprovals: number;
    readonly maxWallClockMs: number;
}
export interface LongHorizonResourceUsage {
    readonly generationsConsumed: number;
    readonly stepsConsumed: number;
    readonly executionAttempts: number;
    readonly replanningAttempts: number;
    readonly consecutiveFailures: number;
    readonly stagnationCycles: number;
    readonly approvalsRequested: number;
    readonly environmentChecks: number;
    readonly persistenceOperations: number;
    readonly wallClockStartTime: string;
    readonly wallClockElapsedMs: number;
}
export interface GovernedLongHorizonObjective {
    readonly objectiveId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly originatingTaskId: string;
    readonly sourcePlanProvenance: string;
    readonly objectiveDescription: string;
    readonly objectiveConstraints: readonly string[];
    readonly successCriteria: readonly string[];
    readonly failureCriteria: readonly string[];
    readonly autonomyBudget: LongHorizonAutonomyBudget;
    readonly authorizationScope: {
        readonly allowedDomains?: readonly string[];
        readonly maxRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        readonly requiredCapabilities?: readonly string[];
    } | readonly string[] | any;
    readonly riskPolicy: {
        readonly maxAllowedRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        readonly maxPermittedRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        readonly requiresHumanForHighRisk?: boolean;
        readonly requireHumanConfirmationForHighRisk?: boolean;
        readonly allowedCapabilities?: readonly string[];
    } | any;
    readonly currentGenerationId: string;
    readonly currentState: LongHorizonState;
    readonly provenanceHash: string;
    readonly createdAt: string;
    readonly expiresAt: string;
    readonly version: number;
}
export interface LongHorizonGeneration {
    readonly generationId: string;
    readonly parentGenerationId?: string;
    readonly generationNumber: number;
    readonly objectiveId: string;
    readonly multiStepSessionId: string;
    readonly planProvenance: string;
    readonly taskProvenance: string;
    readonly authorizationProvenance: string;
    readonly environmentProvenance: string;
    readonly leaseProvenance: string;
    readonly resultProvenance?: string;
    readonly status: 'ACTIVE' | 'SUPERSEDED' | 'ABORTED' | 'INVALIDATED' | 'COMPLETED';
    readonly createdAt: string;
    readonly supersededAt?: string;
    readonly provenanceHash: string;
    readonly version: number;
}
export interface LongHorizonProgressRecord {
    readonly recordId: string;
    readonly objectiveId: string;
    readonly generationId: string;
    readonly completedSteps: number;
    readonly verifiedOutcomes: readonly string[];
    readonly environmentSnapshotProvenance: string;
    readonly objectiveProgressState: ProgressClassification;
    readonly progressScore: number;
    readonly failureCount: number;
    readonly stagnationCounter: number;
    readonly timestamp: string;
    readonly provenanceHash: string;
}
export interface LongHorizonSession {
    readonly horizonSessionId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly objective: GovernedLongHorizonObjective;
    readonly budget: LongHorizonAutonomyBudget;
    readonly usage: LongHorizonResourceUsage;
    readonly generations: readonly LongHorizonGeneration[];
    readonly progressLedger: readonly LongHorizonProgressRecord[];
    readonly currentState: LongHorizonState;
    readonly sessionVersion: number;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly provenanceHash: string;
}
export interface LongHorizonSessionDocument {
    readonly schemaVersion: string;
    readonly session: LongHorizonSession;
    readonly sessionVersion: number;
    readonly documentHash: string;
    readonly updatedAt: string;
}
export interface LongHorizonExecutionResult {
    readonly horizonSessionId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly objectiveId: string;
    readonly finalState: LongHorizonState;
    readonly progressSummary: {
        readonly finalClassification: ProgressClassification;
        readonly totalGenerations: number;
        readonly totalStepsCompleted: number;
        readonly totalReplanningAttempts: number;
        readonly verifiedOutcomes: readonly string[];
    };
    readonly usage: LongHorizonResourceUsage;
    readonly completedAt: string;
    readonly provenanceHash: string;
}
export declare class LongHorizonExecutionError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonValidationError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonAuthorizationError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonBudgetExhaustedError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonStagnationError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonGenerationError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonTenantIsolationError extends LongHorizonExecutionError {
    constructor(expectedTenant: string, actualTenant: string);
}
export declare class LongHorizonSessionIsolationError extends LongHorizonExecutionError {
    constructor(expectedSession: string, actualSession: string);
}
export declare class LongHorizonUserStopError extends LongHorizonExecutionError {
    constructor(checkpoint: string);
}
export declare class LongHorizonConcurrencyError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonPersistenceError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonContinuityError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonReplanningError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LongHorizonSecurityBoundaryError extends LongHorizonExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export { LongHorizonExecutionError as LongHorizonGovernanceError };
export declare function computeObjectiveProvenanceHash(objective: Omit<GovernedLongHorizonObjective, 'provenanceHash'>): string;
export declare function computeLongHorizonGenerationProvenanceHash(gen: Omit<LongHorizonGeneration, 'provenanceHash'>): string;
export declare function computeLongHorizonProgressProvenanceHash(rec: Omit<LongHorizonProgressRecord, 'provenanceHash'>): string;
export declare function computeLongHorizonSessionProvenanceHash(session: Omit<LongHorizonSession, 'provenanceHash'>): string;
export declare function computeLongHorizonDocumentProvenanceHash(doc: Omit<LongHorizonSessionDocument, 'documentHash'>): string;
export declare function computeLongHorizonResultProvenanceHash(res: Omit<LongHorizonExecutionResult, 'provenanceHash'>): string;
