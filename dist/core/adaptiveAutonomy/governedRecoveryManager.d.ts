import { RecoverableFailureClass, RecoveryPolicy, RecoveryAttempt, RecoveryCheckpoint } from './adaptiveAutonomyTypes.js';
import { SupervisionBudgetManager } from './supervisionBudgetManager.js';
import { AdaptiveAutonomySecurityBoundary } from './adaptiveAutonomySecurityBoundary.js';
export interface RecoveryExecutionPlan {
    readonly recoveryAction: string;
    readonly targetParameters: Record<string, unknown>;
    readonly requiresLeaseRevalidation?: boolean;
}
export declare class GovernedRecoveryManager {
    private readonly tenantId;
    private readonly sessionId;
    private readonly policy;
    private readonly budgetManager;
    private readonly securityBoundary;
    private readonly attempts;
    private readonly checkpoints;
    constructor(tenantId: string, sessionId: string, policy: RecoveryPolicy, budgetManager: SupervisionBudgetManager, securityBoundary: AdaptiveAutonomySecurityBoundary);
    getAttempts(): readonly RecoveryAttempt[];
    getCheckpoints(): readonly RecoveryCheckpoint[];
    /**
     * EN: Evaluates if a failure class is classified as recoverable under the active policy.
     * VI: Đánh giá xem một lớp lỗi có được phân loại là có thể phục hồi theo chính sách hiện hoạt không.
     */
    isRecoverable(failureClass: string): failureClass is RecoverableFailureClass;
    /**
     * EN: Creates a recovery checkpoint capturing safe state before attempting recovery.
     * VI: Tạo điểm kiểm tra phục hồi ghi lại trạng thái an toàn trước khi thử phục hồi.
     */
    createCheckpoint(cycleNumber: number, generationNumber: number, stateSnapshot: Record<string, unknown>): RecoveryCheckpoint;
    /**
     * EN: Executes a bounded recovery attempt, strictly enforcing the MAX_RECOVERY_ATTEMPTS ceiling.
     * VI: Thực thi một lần thử phục hồi có giới hạn, thực thi nghiêm ngặt giới hạn trần MAX_RECOVERY_ATTEMPTS.
     */
    executeRecovery(incidentId: string, failureClass: string, plan: RecoveryExecutionPlan, context: {
        cycleNumber: number;
        generationNumber: number;
        currentState: Record<string, unknown>;
        lease: {
            leaseId: string;
            tenantId: string;
            expiresAt: number;
            isRevoked?: boolean;
        };
    }): Promise<RecoveryAttempt>;
}
