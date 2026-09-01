import type { ProductionRolloutStage, RolloutState } from '../monitoring/analyticsTypes.js';
export declare function getRolloutState(): RolloutState;
export declare function shouldRouteToV3(identifier: string): boolean;
export interface UpdateStageOptions {
    adminUserId: string;
    targetStage: ProductionRolloutStage;
    healthScore?: number;
    circuitOpen?: boolean;
    hasCriticalIncident?: boolean;
    hasInvariantBreach?: boolean;
}
export declare function updateRolloutStage(options: UpdateStageOptions): {
    success: boolean;
    error?: string;
    state: RolloutState;
};
export declare function blockRollout(reason: string): void;
export declare function unblockRollout(adminUserId: string): void;
export declare function resetRolloutState(): void;
