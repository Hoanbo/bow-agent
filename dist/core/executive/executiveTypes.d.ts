import type { ActionRiskLevel } from '../world-action/worldActionTypes.js';
export type ExecutiveRiskLevel = ActionRiskLevel;
export type GoalId = string;
export type TaskId = string;
export type TraceId = string;
export type SessionId = string;
/**
 * Authority levels in the BOWCON hierarchy. Lower numbers denote higher authority.
 * LEVEL 0: System safety (global emergency stops, host integrity)
 * LEVEL 1: Human operator (explicit STOP, CANCEL, PAUSE, token approval)
 * LEVEL 2: Governance / PDP (policy decision point, risk gating)
 * LEVEL 3: Supervisor runtime (autonomous anomaly detection, remediation)
 * LEVEL 4: Executive task orchestrator (DAG scheduler, progress engine)
 * LEVEL 5: Cognitive reasoning (advisory proposals, planning suggestions)
 * LEVEL 6: Capability & world action execution (actual tool execution)
 */
export declare enum AuthorityLevel {
    LEVEL_0_SYSTEM_SAFETY = 0,
    LEVEL_1_HUMAN_OPERATOR = 1,
    LEVEL_2_GOVERNANCE_PDP = 2,
    LEVEL_3_SUPERVISOR = 3,
    LEVEL_4_EXECUTIVE_ORCHESTRATOR = 4,
    LEVEL_5_COGNITIVE_REASONING = 5,
    LEVEL_6_CAPABILITY_EXECUTION = 6
}
/**
 * Authoritative 18-state lifecycle for an Executive Goal.
 */
export type GoalStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'CREATED' | 'INTERPRETING' | 'INTERPRETED' | 'DECOMPOSING' | 'DECOMPOSED' | 'PLANNING' | 'READY' | 'RUNNING' | 'WAITING' | 'PAUSED' | 'BLOCKED' | 'RECOVERING' | 'AWAITING_HUMAN' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'STOPPED' | 'EXPIRED';
/**
 * Authoritative 12-state lifecycle for an Executive Task.
 */
export type TaskStatus = 'PENDING' | 'READY' | 'RUNNING' | 'WAITING_FOR_CHILDREN' | 'AWAITING_HUMAN' | 'EXECUTED' | 'VERIFIED' | 'COMPLETED' | 'FAILED' | 'RECOVERING' | 'BLOCKED' | 'CANCELLED' | 'SKIPPED';
/**
 * Priority levels for scheduling.
 */
export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL' | 'LOW' | 'BACKGROUND';
export type GoalPriority = TaskPriority;
export interface TaskDependency {
    readonly parentTaskId: TaskId;
    readonly requiredStatus?: 'COMPLETED' | 'VERIFIED';
    readonly taskId?: TaskId;
}
export interface TaskRetryPolicy {
    readonly maxAttempts: number;
    readonly backoffMs: number;
    readonly initialBackoffMs?: number;
    readonly backoffFactor?: number;
    readonly maxBackoffMs?: number;
}
export interface TaskRecoveryPolicy {
    readonly autoRecover: boolean;
    readonly supervisorSupervised: boolean;
}
export interface TaskSuccessCriteria {
    readonly description: string;
    readonly targetType: 'FILE' | 'PROCESS' | 'CAPABILITY' | 'STATE';
    readonly targetKey?: string;
    readonly expectedValue?: unknown;
}
export interface TaskFailureCriteria {
    readonly description: string;
    readonly fatal: boolean;
}
export interface ExecutiveTaskPlan {
    readonly planId: string;
    readonly capabilityId: string;
    readonly actionName: string;
    readonly targetPath?: string;
    readonly parameters: Record<string, unknown>;
    readonly isDryRun: boolean;
}
export interface ExecutiveTaskResult {
    readonly taskId: TaskId;
    readonly success: boolean;
    readonly executionTimeMs: number;
    readonly verified: boolean;
    readonly verificationDetails?: string;
    readonly error?: string;
    readonly outputData?: unknown;
}
export interface ExecutiveTask {
    readonly taskId: TaskId;
    readonly goalId: GoalId;
    readonly parentTaskId?: TaskId;
    readonly traceId: TraceId;
    readonly title: string;
    readonly description: string;
    readonly taskType: 'OBSERVE' | 'MUTATE' | 'VERIFY' | 'RECOVER' | 'GATE';
    priority: TaskPriority;
    status: TaskStatus;
    readonly dependencies: TaskDependency[];
    readonly requiredCapabilities: string[];
    readonly riskLevel: ExecutiveRiskLevel;
    readonly permissionLevel: 'AUTO_EXECUTE' | 'AWAIT_HUMAN_AUTHORIZATION';
    plan?: ExecutiveTaskPlan;
    attemptCount: number;
    retryPolicy: TaskRetryPolicy;
    recoveryPolicy: TaskRecoveryPolicy;
    successCriteria: TaskSuccessCriteria[];
    failureCriteria: TaskFailureCriteria[];
    result?: ExecutiveTaskResult;
    error?: string;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    metadata?: Record<string, unknown>;
}
export interface CreateTaskOptions {
    readonly goalId: GoalId;
    readonly parentTaskId?: TaskId;
    readonly traceId?: TraceId;
    readonly title: string;
    readonly description: string;
    readonly taskType?: 'OBSERVE' | 'MUTATE' | 'VERIFY' | 'RECOVER' | 'GATE';
    readonly priority?: TaskPriority;
    readonly dependencies?: TaskDependency[];
    readonly requiredCapabilities?: string[];
    readonly riskLevel?: ExecutiveRiskLevel;
    readonly permissionLevel?: 'AUTO_EXECUTE' | 'AWAIT_HUMAN_AUTHORIZATION';
    readonly plan?: ExecutiveTaskPlan;
    readonly retryPolicy?: Partial<TaskRetryPolicy>;
    readonly recoveryPolicy?: Partial<TaskRecoveryPolicy>;
    readonly successCriteria?: TaskSuccessCriteria[];
    readonly failureCriteria?: TaskFailureCriteria[];
    readonly metadata?: Record<string, unknown>;
}
export interface GoalProgress {
    readonly goalId: GoalId;
    readonly totalTasks: number;
    readonly completedTasks: number;
    readonly failedTasks: number;
    readonly blockedTasks: number;
    readonly pendingTasks: number;
    readonly percentComplete: number;
    readonly isComplete: boolean;
    readonly lastUpdated: number;
}
export interface ExecutiveGoalSuccessCriteria {
    readonly description: string;
    readonly requiredTasksCompleted: boolean;
    readonly customValidationKey?: string;
}
export interface ExecutiveGoalFailureCriteria {
    readonly description: string;
    readonly maxFailedTasks?: number;
    readonly timeoutMs?: number;
}
export interface ExecutiveGoal {
    readonly goalId: GoalId;
    readonly traceId: TraceId;
    readonly sessionId: SessionId;
    readonly createdAt: number;
    updatedAt: number;
    readonly title?: string;
    readonly intent?: string;
    readonly objective: string;
    readonly description: string;
    priority: TaskPriority;
    status: GoalStatus;
    readonly origin: 'USER' | 'SYSTEM' | 'SUPERVISOR';
    readonly constraints: string[];
    readonly successCriteria: ExecutiveGoalSuccessCriteria;
    readonly failureCriteria: ExecutiveGoalFailureCriteria;
    readonly authorizationPolicy: 'DEFAULT' | 'STRICT' | 'ELEVATED';
    currentTaskId?: TaskId;
    deadline?: number;
    progress: GoalProgress;
    metadata?: Record<string, unknown>;
}
export interface ExecutiveEscalationRecord {
    readonly escalationId: string;
    readonly goalId: GoalId;
    readonly taskId?: TaskId;
    readonly reason: string;
    readonly diagnosis: string;
    readonly attempts: number;
    readonly blockedBy?: string;
    readonly requiredHumanDecision: string;
    readonly riskLevel: ExecutiveRiskLevel;
    readonly timestamp: number;
}
export interface ExecutiveCheckpoint {
    readonly checkpointId: string;
    readonly version: string;
    readonly timestamp: number;
    readonly sessionId: SessionId;
    readonly goal: ExecutiveGoal;
    readonly tasks: ExecutiveTask[];
    readonly progress: GoalProgress;
    readonly escalationRecords: ExecutiveEscalationRecord[];
    readonly sha256Checksum: string;
}
export interface ExecutiveHealth {
    readonly status: 'OPERATIONAL' | 'HEALTHY' | 'RUNNING' | 'USER_STOP' | 'PAUSED' | 'DEGRADED';
    readonly userStop: boolean;
    readonly activeGoals: number;
    readonly activeTasks: number;
    readonly pendingAuthorizations: number;
    readonly completedGoals: number;
    readonly failedGoals: number;
    readonly totalTasksExecuted: number;
    readonly persistencePath: string;
    readonly isSafeStopActive: boolean;
    readonly isUserStopActive: boolean;
    readonly activeLocks: number;
}
