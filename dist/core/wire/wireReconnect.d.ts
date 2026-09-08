import type { NetworkType } from '../admission/admissionTypes.js';
export interface WireReconnectConfig {
    readonly initialDelayMs: number;
    readonly maxDelayMs: number;
    readonly multiplier: number;
    readonly jitterFactor: number;
    readonly maxAttempts: number;
}
export declare const DEFAULT_WIRE_RECONNECT_CONFIG: WireReconnectConfig;
export interface NetworkRoamingSnapshot {
    readonly deviceId: string;
    readonly previousNetworkType?: NetworkType;
    readonly currentNetworkType: NetworkType;
    readonly previousIp?: string;
    readonly currentIp: string;
    readonly roamingTimestamp: number;
    readonly identityPreserved: boolean;
}
export declare class WireReconnectScheduler {
    private attempts;
    private readonly config;
    constructor(config?: Partial<WireReconnectConfig>);
    /**
     * Computes delay in milliseconds for next reconnect attempt using bounded exponential backoff.
     */
    computeNextDelay(deviceId: string): {
        delayMs: number;
        attempt: number;
        canRetry: boolean;
    };
    /**
     * Handles network roaming event (e.g. WiFi -> 4G -> 5G).
     * Verifies that device identity remains unchanged despite IP/network changes.
     */
    recordRoamingEvent(params: {
        deviceId: string;
        previousNetworkType?: NetworkType;
        currentNetworkType: NetworkType;
        previousIp?: string;
        currentIp: string;
    }): NetworkRoamingSnapshot;
    reset(deviceId: string): void;
    getAttempts(deviceId: string): number;
}
