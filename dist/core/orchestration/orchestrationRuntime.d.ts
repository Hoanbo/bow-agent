import type { TaskId, AgentTask, TaskGroup, TaskArtifact, EvidenceBundle, TaskReviewState, AgentTaskResult, TaskContradiction, OrchestrationErrorCode } from './taskOrchestrationTypes.js';
import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { AuditLedger } from '../auditLedger.js';
import { GovernedTaskOrchestrator, CreateTaskGroupInput, CreateTaskInput, AssignTaskInput } from './governedTaskOrchestrator.js';
import { TaskDependencyEngine } from './taskDependencyEngine.js';
import { ArtifactEvidenceEngine, CreateArtifactInput } from './artifactEvidenceEngine.js';
import { EvidenceVerificationEngine } from './evidenceVerificationEngine.js';
import { EvidenceAggregationEngine } from './evidenceAggregationEngine.js';
import { TaskReviewEngine } from './taskReviewEngine.js';
export declare class OrchestrationRuntimeError extends Error {
    readonly code: OrchestrationErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: OrchestrationErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
export declare class OrchestrationRuntime {
    readonly orchestrator: GovernedTaskOrchestrator;
    readonly dependencyEngine: TaskDependencyEngine;
    readonly artifactEngine: ArtifactEvidenceEngine;
    readonly verificationEngine: EvidenceVerificationEngine;
    readonly aggregationEngine: EvidenceAggregationEngine;
    readonly reviewEngine: TaskReviewEngine;
    private readonly auditLedger;
    private readonly masterAuthority;
    private _isStopped;
    private _stopReason;
    constructor(orchestrator?: GovernedTaskOrchestrator, dependencyEngine?: TaskDependencyEngine, artifactEngine?: ArtifactEvidenceEngine, verificationEngine?: EvidenceVerificationEngine, aggregationEngine?: EvidenceAggregationEngine, reviewEngine?: TaskReviewEngine, auditLedger?: AuditLedger, masterAuthority?: MasterHumanAuthority);
    get isUserStopActive(): boolean;
    get stopReason(): string;
    emergencyStop(reason?: string): void;
    resetEmergencyStop(operatorId: string): void;
    private assertNotStopped;
    /**
     * Creates a new task group.
     */
    createTaskGroup(input: CreateTaskGroupInput): TaskGroup;
    /**
     * Creates a governed task within a task group.
     */
    createTask(input: CreateTaskInput): AgentTask;
    /**
     * Assigns a task to a governed agent after validating delegation scope.
     */
    assignTask(input: AssignTaskInput): AgentTask;
    /**
     * Starts task execution after verifying dependencies.
     */
    startTask(taskId: TaskId): AgentTask;
    /**
     * Records a generated task artifact.
     */
    recordArtifact(input: CreateArtifactInput): TaskArtifact;
    /**
     * Submits an agent execution result and advances the task into VERIFICATION_PENDING.
     */
    submitResult(taskId: TaskId, result: AgentTaskResult): AgentTask;
    /**
     * Verifies, aggregates, and reviews a completed task.
     */
    verifyAndReviewTask(params: {
        taskId: TaskId;
        reviewerId: string;
        reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
        notes?: string;
    }): {
        task: AgentTask;
        bundle: EvidenceBundle;
        review: TaskReviewState;
        contradictions: readonly TaskContradiction[];
    };
    /**
     * Internal audit logger ensuring compliance with append-only canonical ledger.
     */
    private logAudit;
    clear(): void;
}
export declare const globalOrchestrationRuntime: OrchestrationRuntime;
