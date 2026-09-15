import { AutonomyBudgetSnapshot } from './adaptiveAutonomyTypes.js';
export interface BudgetManagerOptions {
    readonly initialBudget?: Partial<AutonomyBudgetSnapshot>;
    readonly tenantId: string;
    readonly sessionId: string;
}
export declare class SupervisionBudgetManager {
    private readonly tenantId;
    private readonly sessionId;
    private maxOperationalCycles;
    private cyclesConsumed;
    private maxRecoveryAttempts;
    private recoveryAttemptsConsumed;
    private maxAdaptationAttempts;
    private adaptationAttemptsConsumed;
    private maxContinuityGenerations;
    private continuityGenerationsConsumed;
    private sessionDurationLimitMs;
    private readonly sessionStartedAt;
    private consecutiveFailures;
    private consecutiveDegradations;
    constructor(options: BudgetManagerOptions);
    getSnapshot(): AutonomyBudgetSnapshot;
    assertBudgetAvailable(): void;
    consumeCycle(): void;
    consumeRecoveryAttempt(): void;
    consumeAdaptationAttempt(): void;
    consumeContinuityGeneration(): void;
    recordCycleOutcome(isSuccess: boolean, isDegraded: boolean): void;
    /**
     * EN: Refreshes budget with genuine human governance token only. Self-authorization is strictly prohibited.
     * VI: Làm mới ngân sách chỉ bằng mã quản trị con người thực sự. Tự ủy quyền bị nghiêm cấm.
     */
    refreshBudgetWithHumanToken(humanConfirmationToken: string, humanOperatorId: string, extensions: {
        additionalCycles?: number;
        additionalRecoveryAttempts?: number;
    }): void;
}
