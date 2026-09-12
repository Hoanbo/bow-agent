import { type GovernedRemediationPlan, type RemediationExecutionResult, type RemediationExecutionId, type RemediationSnapshot } from './remediationTypes.js';
export declare class RemediationExecutionError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export interface ExecuteRemediationOptions {
    readonly plan: GovernedRemediationPlan;
    readonly snapshot: RemediationSnapshot;
    readonly isUserStopActive: () => boolean;
    readonly baseDirectory?: string;
    readonly customAdapters?: Record<string, (plan: GovernedRemediationPlan, snapshot: RemediationSnapshot) => Promise<{
        appliedChanges: readonly string[];
        outputSummary: string;
    }>>;
}
export declare class RemediationExecutionEngine {
    /**
     * Executes an authorized remediation plan using predefined internal typed capability adapters.
     * Thực thi kế hoạch khắc phục được ủy quyền bằng cách sử dụng các bộ điều hợp năng lực nội bộ định sẵn.
     */
    executePlan(options: ExecuteRemediationOptions): Promise<RemediationExecutionResult>;
    private handleConfigSync;
    private handleRollbackAction;
    private handleProcessRestart;
    private handleTrafficDrain;
    computeExecutionSha256(executionId: RemediationExecutionId, plan: GovernedRemediationPlan, appliedChanges: readonly string[], state: string): string;
}
