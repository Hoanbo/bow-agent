import type { WorldAction } from './worldActionTypes.js';
export interface WorldActionRuntimeHealth {
    readonly runtimeState: 'OPERATIONAL' | 'SAFE_STOP' | 'DEGRADED';
    readonly queuedActions: number;
    readonly activeActions: number;
    readonly completedActions: number;
    readonly failedActions: number;
    readonly deniedActions: number;
    readonly verifiedActions: number;
    readonly emergencyStop: boolean;
    readonly toolRegistryHealth: {
        totalTools: number;
        enabledTools: number;
    };
    readonly authorizationHealth: {
        activeTokens: number;
    };
    readonly verifierHealth: {
        verifiedCount: number;
        failureCount: number;
    };
}
export declare class WorldActionRuntime {
    private _emergencyStop;
    private _emergencyStopReason?;
    private _activeLocks;
    private _idempotencyCache;
    private _completedCount;
    private _failedCount;
    private _deniedCount;
    private _verifiedCount;
    private _verifierFailureCount;
    private _activeActionCount;
    activateEmergencyStop(reason: string): void;
    resetEmergencyStop(operatorToken: string): void;
    isEmergencyStopActive(): boolean;
    private makeResourceKey;
    acquireLock(target: string): boolean;
    releaseLock(target: string): void;
    isLocked(target: string): boolean;
    /**
     * Executes a WorldAction through the full governance pipeline:
     * Idempotency -> Prepare -> Authorize -> Lock -> Execute -> Verify -> Commit -> Audit
     */
    executeAction(action: WorldAction): Promise<WorldAction>;
    getHealth(): WorldActionRuntimeHealth;
    clearIdempotency(): void;
}
export declare const globalWorldActionRuntime: WorldActionRuntime;
