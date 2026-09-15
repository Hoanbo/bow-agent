import { type MultiStepExecutionSession, type MultiStepExecutionResult } from './multiStepExecutionTypes.js';
import { ExecutionEnvironmentMonitor } from './executionEnvironmentMonitor.js';
import { GovernedReplanningEngine } from './governedReplanningEngine.js';
import { ExecutionGenerationManager } from './executionGenerationManager.js';
import { MultiStepExecutionSecurityBoundary } from './multiStepExecutionSecurityBoundary.js';
import { MultiStepExecutionPersistenceRecoveryEngine } from './multiStepExecutionPersistenceRecoveryEngine.js';
import { GovernedExecutionWorker, ExecutionLeaseManager } from '../governedExecution/index.js';
import { AgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import { type AuditLedger } from '../auditLedger.js';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
export interface OrchestratorOptions {
    readonly worker?: GovernedExecutionWorker;
    readonly leaseManager?: ExecutionLeaseManager;
    readonly persistenceEngine?: MultiStepExecutionPersistenceRecoveryEngine;
    readonly environmentMonitor?: ExecutionEnvironmentMonitor;
    readonly generationManager?: ExecutionGenerationManager;
    readonly replanningEngine?: GovernedReplanningEngine;
    readonly securityBoundary?: MultiStepExecutionSecurityBoundary;
    readonly auditLedger?: AuditLedger;
    readonly taskRuntime?: AgentTaskRuntime;
    readonly userStopProvider?: () => boolean;
}
export interface OrchestratorRunParams {
    readonly session: MultiStepExecutionSession;
    readonly observedPreconditions?: Record<string, boolean | string | number>;
    readonly humanConfirmationTokens?: Record<string, string>;
}
export declare class GovernedExecutionOrchestrator {
    private readonly worker;
    private readonly leaseManager;
    private readonly persistenceEngine;
    private readonly environmentMonitor;
    private readonly generationManager;
    private readonly replanningEngine;
    private readonly securityBoundary;
    private readonly auditLedger;
    private readonly taskRuntime;
    private readonly userStopProvider;
    constructor(options?: OrchestratorOptions);
    /**
     * EN: Initializes a new multi-step execution session from an approved GroundedPlanTaskBinding and AgentTask.
     * VI: Khởi tạo một phiên thực thi nhiều bước mới từ GroundedPlanTaskBinding và AgentTask đã được phê duyệt.
     */
    initializeSession(params: {
        readonly tenantId: string;
        readonly sessionId: string;
        readonly taskId: string;
        readonly planId: string;
        readonly planVersion: number;
        readonly bindingSnapshot: GroundedPlanTaskBinding;
        readonly taskSnapshot: AgentTask;
    }): MultiStepExecutionSession;
    /**
     * EN: Runs the multi-step execution loop step-by-step under strict governance.
     * VI: Chạy vòng lặp thực thi nhiều bước từng bước một dưới sự quản trị nghiêm ngặt.
     */
    executeSession(params: OrchestratorRunParams): Promise<MultiStepExecutionResult>;
    /**
     * EN: Resumes execution with a newly governed replanned generation.
     * VI: Tiếp tục thực thi với một thế hệ được lập kế hoạch lại có quản trị mới.
     */
    resumeWithReplannedGeneration(params: {
        readonly session: MultiStepExecutionSession;
        readonly newBindingSnapshot: GroundedPlanTaskBinding;
        readonly newTaskSnapshot: AgentTask;
    }): MultiStepExecutionSession;
    private updateSessionStatus;
    private createCheckpoint;
    private buildStepAuthorizationEnvelope;
    private buildExecutionRequest;
    private createExecutionResult;
    private recordAuditEvent;
}
