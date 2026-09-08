export declare const BRAIN_SUBSYSTEM_VERSION = "4.0.0";
export declare const BRAIN_ID_PREFIX = "brain";
export declare const BRAIN_TASK_ID_PREFIX = "task";
export declare const BRAIN_MAX_ITERATIONS_PER_TASK = 10;
export declare const BRAIN_MAX_RECOVERY_DEPTH = 3;
export declare const BRAIN_MAX_RETRY_ATTEMPTS = 3;
export declare const BRAIN_TASK_DEFAULT_DEADLINE_MS = 60000;
export declare const BRAIN_IDLE_TIMEOUT_MS = 300000;
export declare const BRAIN_TOOL_EXECUTION_TIMEOUT_MS = 30000;
export declare const BRAIN_LLM_TIMEOUT_MS = 30000;
export type BrainId = string & {
    readonly __brand: 'BrainId';
};
export declare function makeBrainId(seed: string): BrainId;
export type BrainTaskId = string & {
    readonly __brand: 'BrainTaskId';
};
export declare function makeBrainTaskId(): BrainTaskId;
export type BrainTaskRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BrainTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type BrainTaskStatus = 'PENDING' | 'UNDERSTANDING' | 'REASONING' | 'PLANNING' | 'DECIDING' | 'ACTION_PREPARING' | 'EXECUTING' | 'OBSERVING' | 'VERIFYING' | 'COMMITTING' | 'COMPLETED' | 'RECOVERING' | 'REPLANNING' | 'PAUSED' | 'CANCELLING' | 'CANCELLED' | 'FAILED';
export declare const BRAIN_TASK_TERMINAL_STATUSES: readonly BrainTaskStatus[];
export declare const BRAIN_TASK_ACTIVE_STATUSES: readonly BrainTaskStatus[];
export declare function isBrainTaskTerminal(status: BrainTaskStatus): boolean;
export declare function isBrainTaskActive(status: BrainTaskStatus): boolean;
export type BrainVerificationStatus = 'UNVERIFIED' | 'VERIFYING' | 'VERIFIED' | 'VERIFICATION_FAILED';
export type BrainCommitState = 'UNCOMMITTED' | 'COMMITTING' | 'COMMITTED' | 'COMMIT_FAILED';
export interface BrainPlanStep {
    readonly stepId: string;
    readonly order: number;
    readonly description: string;
    readonly toolName: string;
    readonly toolArgs: Record<string, unknown>;
    readonly isCompleted: boolean;
    readonly skipped: boolean;
}
export interface BrainPlan {
    readonly planId: string;
    readonly taskId: BrainTaskId;
    readonly createdAt: number;
    readonly reasoning: string;
    readonly steps: readonly BrainPlanStep[];
    readonly revision: number;
}
export interface BrainToolExecutionRecord {
    readonly executionId: string;
    readonly taskId: BrainTaskId;
    readonly toolName: string;
    readonly args: Record<string, unknown>;
    readonly startedAt: number;
    readonly completedAt?: number;
    readonly rawResult?: unknown;
    readonly succeeded: boolean;
    readonly errorMessage?: string;
}
export interface BrainObservation {
    readonly observationId: string;
    readonly taskId: BrainTaskId;
    readonly toolName: string;
    readonly observedAt: number;
    readonly expectedConditions: readonly string[];
    readonly actualConditions: readonly string[];
    readonly allMet: boolean;
    readonly notes?: string;
}
export interface BrainVerificationRecord {
    readonly verificationId: string;
    readonly taskId: BrainTaskId;
    readonly status: BrainVerificationStatus;
    readonly verifiedAt: number;
    readonly passed: boolean;
    readonly evidence: readonly string[];
    readonly failureReason?: string;
}
export interface BrainTaskFailure {
    readonly code: string;
    readonly message: string;
    readonly occurredAt: number;
    readonly step?: string;
    readonly recoverable: boolean;
}
export interface BrainTaskResult {
    readonly taskId: BrainTaskId;
    readonly success: boolean;
    readonly summary: string;
    readonly data?: unknown;
    readonly verificationStatus: BrainVerificationStatus;
    readonly completedAt: number;
    readonly totalDurationMs: number;
    readonly iterationCount: number;
}
export interface BrainRecoveryDecision {
    readonly shouldRecover: boolean;
    readonly recoveryAction: 'REPLAN' | 'RETRY_STEP' | 'ABORT' | 'ESCALATE';
    readonly reason: string;
    readonly newPlanRequired: boolean;
}
export interface BrainModelOutput {
    readonly understanding: string;
    readonly reasoning: string;
    readonly proposedToolName: string;
    readonly proposedToolArgs: Record<string, unknown>;
    readonly planSummary: string;
    readonly confidence: number;
    readonly requiresConfirmation: boolean;
}
export type BrainAuditEventType = 'BRAIN_STARTED' | 'BRAIN_STOPPED' | 'TASK_CREATED' | 'TASK_STATUS_CHANGED' | 'UNDERSTANDING_COMPLETED' | 'REASONING_COMPLETED' | 'PLAN_CREATED' | 'DECISION_MADE' | 'ACTION_REQUESTED' | 'ACTION_EXECUTED' | 'OBSERVATION_RECEIVED' | 'VERIFICATION_STARTED' | 'VERIFICATION_COMPLETED' | 'RECOVERY_STARTED' | 'REPLAN_CREATED' | 'COMMIT_COMPLETED' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'TASK_CANCELLED' | 'TASK_PAUSED' | 'TASK_RESUMED';
export interface BrainAuditEvent {
    readonly type: BrainAuditEventType;
    readonly taskId?: BrainTaskId;
    readonly brainId: BrainId;
    readonly timestamp: number;
    readonly data?: Record<string, unknown>;
}
export interface BrainAuditLedger {
    events: BrainAuditEvent[];
}
export declare function appendBrainAuditEvent(ledger: BrainAuditLedger, event: Omit<BrainAuditEvent, 'timestamp'> & {
    timestamp?: number;
}): void;
export interface BrainMetrics {
    totalTasksCreated: number;
    totalTasksCompleted: number;
    totalTasksFailed: number;
    totalTasksCancelled: number;
    totalToolExecutions: number;
    totalVerifications: number;
    totalRecoveries: number;
    totalIterations: number;
    uptimeMs: number;
    startedAt: number;
}
