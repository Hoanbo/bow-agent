import { type GovernedLongHorizonObjective, type LongHorizonSession, type LongHorizonExecutionResult, type LongHorizonState } from './longHorizonExecutionTypes.js';
import { ObjectiveProgressEvaluator } from './objectiveProgressEvaluator.js';
import { LongHorizonBudgetManager } from './longHorizonBudgetManager.js';
import { LongHorizonContinuityManager } from './longHorizonContinuityManager.js';
import { LongHorizonAutonomySecurityBoundary } from './longHorizonAutonomySecurityBoundary.js';
import { LongHorizonAuditBridge } from './longHorizonAuditBridge.js';
import { LongHorizonPersistenceRecoveryEngine } from './longHorizonPersistenceRecoveryEngine.js';
import { GovernedExecutionOrchestrator } from '../multiStepExecution/governedExecutionOrchestrator.js';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
export interface LongHorizonOrchestratorOptions {
    readonly userStopProvider?: () => boolean;
    readonly persistenceEngine?: LongHorizonPersistenceRecoveryEngine;
    readonly multiStepOrchestrator?: GovernedExecutionOrchestrator;
    readonly budgetManager?: LongHorizonBudgetManager;
    readonly continuityManager?: LongHorizonContinuityManager;
    readonly progressEvaluator?: ObjectiveProgressEvaluator;
    readonly securityBoundary?: LongHorizonAutonomySecurityBoundary;
    readonly auditBridge?: LongHorizonAuditBridge;
}
export interface ExecuteObjectiveParams {
    readonly session: LongHorizonSession;
    readonly humanConfirmationTokens?: Record<string, string>;
    readonly observedPreconditions?: Record<string, boolean | string | number>;
    readonly verifiedOutcomes?: readonly string[];
}
export declare class GovernedLongHorizonOrchestrator {
    private readonly userStopProvider;
    private readonly persistenceEngine;
    private readonly multiStepOrchestrator;
    private readonly budgetManager;
    private readonly continuityManager;
    private readonly progressEvaluator;
    private readonly securityBoundary;
    private readonly auditBridge;
    constructor(options?: LongHorizonOrchestratorOptions);
    /**
     * EN: Initializes a new governed long-horizon session with Generation 0.
     * VI: Khởi tạo một phiên tầm nhìn dài có quản trị mới với Thế hệ 0.
     */
    initializeLongHorizonSession(params: {
        readonly objective: GovernedLongHorizonObjective;
        readonly initialBinding: GroundedPlanTaskBinding;
        readonly initialTask: AgentTask;
    }): LongHorizonSession;
    /**
     * EN: Runs the governed long-horizon autonomous orchestration loop bounded by explicit budget.
     * VI: Chạy vòng lặp điều phối tự chủ tầm nhìn dài có quản trị được giới hạn bởi ngân sách rõ ràng.
     */
    executeLongHorizonObjective(params: ExecuteObjectiveParams): Promise<LongHorizonExecutionResult>;
    /**
     * EN: Advances session to a new governed replanned generation under explicit authorization.
     * VI: Chuyển phiên sang thế hệ được lập kế hoạch lại có quản trị mới dưới sự ủy quyền rõ ràng.
     */
    advanceToReplannedGeneration(params: {
        readonly session: LongHorizonSession;
        readonly newBinding: GroundedPlanTaskBinding;
        readonly newTask: AgentTask;
    }): LongHorizonSession;
    resumeWithReplannedGeneration(params: {
        readonly session: LongHorizonSession;
        readonly newBindingSnapshot: GroundedPlanTaskBinding;
        readonly newTaskSnapshot: AgentTask;
    }): LongHorizonSession;
    assertUserStopInactive(checkpoint: Parameters<LongHorizonAutonomySecurityBoundary['assertUserStop']>[0]): void;
    completeObjective(session: LongHorizonSession, verifiedOutcomes: readonly string[]): LongHorizonSession;
    terminateSession(session: LongHorizonSession, reason: string, terminalState?: LongHorizonState): LongHorizonSession;
    private updateSessionState;
    private createTerminalResult;
}
