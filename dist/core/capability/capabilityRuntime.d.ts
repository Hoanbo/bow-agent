import type { CapabilityExecutionRequest, CapabilityExecutionResult, HostEnvironmentSnapshot, HostMode } from './capabilityTypes.js';
export interface CapabilityRuntimeHealth {
    readonly status: 'OPERATIONAL' | 'SAFE_STOP' | 'DEGRADED';
    readonly hostMode: HostMode;
    readonly emergencyStop: boolean;
    readonly totalCapabilities: number;
    readonly availableCapabilities: number;
    readonly activeLocks: number;
    readonly executedCount: number;
    readonly verifiedCount: number;
    readonly recoveredCount: number;
}
export declare class CapabilityRuntime {
    private _emergencyStop;
    private _emergencyStopReason?;
    private _activeLocks;
    private _cachedSnapshot?;
    private _executedCount;
    private _verifiedCount;
    private _recoveredCount;
    activateEmergencyStop(reason: string): void;
    triggerEmergencyStop(reason: string): void;
    resetEmergencyStop(operatorToken: string): void;
    isEmergencyStopActive(): boolean;
    private makeResourceKey;
    acquireLock(target?: string): boolean;
    releaseLock(target?: string): void;
    getEnvironmentSnapshot(forceRefresh?: boolean): HostEnvironmentSnapshot;
    executeCapability(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult>;
    getHealth(): CapabilityRuntimeHealth;
}
export declare const globalCapabilityRuntime: CapabilityRuntime;
