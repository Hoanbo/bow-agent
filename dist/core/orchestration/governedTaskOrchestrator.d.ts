import type { TaskId, TaskGroupId, AgentTask, TaskGroup, TaskExecutionState, AgentTaskResult, OrchestrationErrorCode } from './taskOrchestrationTypes.js';
import { AgentIdentityManager } from '../delegation/agentIdentityManager.js';
import { DelegationGovernanceRuntime } from '../delegation/delegationGovernanceRuntime.js';
import { TaskDependencyEngine } from './taskDependencyEngine.js';
export declare class GovernedOrchestrationError extends Error {
    readonly code: OrchestrationErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: OrchestrationErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
export interface CreateTaskGroupInput {
    readonly title: string;
    readonly description?: string;
    readonly sessionId: string;
    readonly ownerId: string;
}
export interface CreateTaskInput {
    readonly groupId: TaskGroupId;
    readonly title: string;
    readonly description: string;
    readonly sessionId: string;
    readonly dependencies?: readonly {
        readonly dependentTaskId: TaskId;
        readonly type?: 'FINISH_TO_START' | 'REQUIRED_ARTIFACT' | 'STRICT_SUCCESS';
        readonly requiredArtifactTypes?: readonly string[];
    }[];
    readonly requiredCapabilities?: readonly string[];
    readonly targetPaths?: readonly string[];
    readonly forbiddenPaths?: readonly string[];
}
export interface AssignTaskInput {
    readonly taskId: TaskId;
    readonly agentId: string;
    readonly deviceId: string;
    readonly delegationId: string;
    readonly leaseId?: string;
}
export declare class GovernedTaskOrchestrator {
    readonly agentIdentityManager: AgentIdentityManager;
    readonly delegationRuntime?: DelegationGovernanceRuntime | undefined;
    readonly dependencyEngine: TaskDependencyEngine;
    private readonly groups;
    private readonly tasks;
    constructor(agentIdentityManager?: AgentIdentityManager, delegationRuntime?: DelegationGovernanceRuntime | undefined, dependencyEngine?: TaskDependencyEngine);
    /**
     * Asserts that paths do not violate the protected workspace C:\BOW\shopofbow.
     */
    assertProtectedWorkspaceSafe(paths: readonly string[]): void;
    /**
     * Creates a governed task group.
     */
    createTaskGroup(input: CreateTaskGroupInput): TaskGroup;
    /**
     * Creates an individual governed task within a task group.
     */
    createTask(input: CreateTaskInput): AgentTask;
    /**
     * Assigns a task to an authorized, governed agent.
     */
    assignTask(input: AssignTaskInput): AgentTask;
    /**
     * Transitions task to RUNNING state.
     */
    startTaskExecution(taskId: TaskId): AgentTask;
    /**
     * Records execution result submitted by an agent.
     */
    submitTaskResult(taskId: TaskId, result: AgentTaskResult): AgentTask;
    /**
     * Updates task state (e.g. after verification or review).
     */
    updateTaskState(taskId: TaskId, newState: TaskExecutionState): AgentTask;
    getTask(taskId: TaskId): AgentTask | undefined;
    getTaskGroup(groupId: TaskGroupId): TaskGroup | undefined;
    getTasksByGroup(groupId: TaskGroupId): readonly AgentTask[];
    clear(): void;
}
export declare const globalGovernedTaskOrchestrator: GovernedTaskOrchestrator;
