import type { ProductionRolloutStage, RollbackRecord } from '../monitoring/analyticsTypes.js';
export interface ExecuteRollbackOptions {
    adminUserId: string;
    targetStage?: ProductionRolloutStage;
    reason: string;
    metricsSnapshot?: Record<string, any>;
}
export declare function executeRollback(options: ExecuteRollbackOptions): {
    success: boolean;
    record: RollbackRecord;
};
export declare function getRollbackHistory(): RollbackRecord[];
export declare function clearRollbackHistory(): void;
