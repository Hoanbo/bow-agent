import { AdaptiveAutonomySession, AdaptiveAutonomyAuthorizationEnvelope, AdaptiveAutonomyResult, RecoveryPolicy, AdaptationBoundary, AutonomyBudgetSnapshot } from './adaptiveAutonomyTypes.js';
import { AdaptiveAutonomyValidator } from './adaptiveAutonomyValidator.js';
import { OperationalHealthEvaluator } from './operationalHealthEvaluator.js';
import { AdaptiveAutonomySecurityBoundary } from './adaptiveAutonomySecurityBoundary.js';
import { AdaptiveAutonomyAuditPersistenceBridge } from './adaptiveAutonomyAuditPersistenceBridge.js';
export interface OrchestratorOptions {
    readonly persistenceBridge?: AdaptiveAutonomyAuditPersistenceBridge;
    readonly securityBoundary?: AdaptiveAutonomySecurityBoundary;
    readonly validator?: AdaptiveAutonomyValidator;
    readonly healthEvaluator?: OperationalHealthEvaluator;
}
export interface CycleExecutionContext {
    readonly cycleNumber: number;
    readonly generationNumber: number;
    readonly proposedOperations: readonly string[];
    readonly stepExecutor?: (cycle: number) => Promise<{
        success: boolean;
        result?: unknown;
        error?: string;
        failureClass?: string;
    }>;
}
export declare class GovernedAdaptiveAutonomyOrchestrator {
    private readonly validator;
    private readonly healthEvaluator;
    private readonly securityBoundary;
    private readonly persistenceBridge;
    constructor(options?: OrchestratorOptions);
    /**
     * EN: Initializes a new governed adaptive autonomy session.
     * VI: Khởi tạo một phiên tự chủ thích ứng có quản trị mới.
     */
    initializeSession(params: {
        readonly tenantId: string;
        readonly sessionId: string;
        readonly objectiveId: string;
        readonly objectiveTitle: string;
        readonly authorizationEnvelope: AdaptiveAutonomyAuthorizationEnvelope;
        readonly recoveryPolicy: RecoveryPolicy;
        readonly adaptationBoundary: AdaptationBoundary;
        readonly initialBudget?: Partial<AutonomyBudgetSnapshot>;
    }): AdaptiveAutonomySession;
    /**
     * EN: Runs continuous bounded supervised operational cycles until completion, suspension, or stop.
     * VI: Chạy các chu kỳ vận hành liên tục có giám sát và giới hạn cho đến khi hoàn thành, tạm dừng hoặc dừng.
     */
    runSupervisedCycles(session: AdaptiveAutonomySession, cyclesToRun: number, executor?: (cycle: number) => Promise<{
        success: boolean;
        result?: unknown;
        error?: string;
        failureClass?: string;
    }>): Promise<AdaptiveAutonomyResult>;
    /**
     * EN: Resumes a suspended or awaiting-review session only after full governance re-verification.
     * VI: Tiếp tục một phiên bị tạm dừng hoặc chờ đánh giá chỉ sau khi tái xác minh toàn bộ quản trị.
     */
    resumeSession(session: AdaptiveAutonomySession, humanConfirmationToken?: string): AdaptiveAutonomySession;
}
