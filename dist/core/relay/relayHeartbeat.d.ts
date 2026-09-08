import type { RelayId, RelayHeartbeatRecord, RelayHeartbeatStatus } from './relayTypes.js';
export interface HeartbeatConfig {
    readonly intervalMs: number;
    readonly degradedMissThreshold: number;
    readonly unhealthyMissThreshold: number;
}
export declare const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig;
export declare class RelayHeartbeatError extends Error {
    constructor(message: string);
}
export declare class RelayHeartbeatTracker {
    private readonly records;
    private readonly config;
    constructor(config?: Partial<HeartbeatConfig>);
    /**
     * Records a successful heartbeat exchange with round-trip time.
     */
    recordHeartbeat(relayId: RelayId, sessionId: string, rttMs: number, now?: number): RelayHeartbeatRecord;
    /**
     * Records a missed heartbeat ping/pong interval.
     */
    recordMissedHeartbeat(sessionId: string, now?: number): RelayHeartbeatRecord;
    getStatus(sessionId: string): RelayHeartbeatStatus;
    getRecord(sessionId: string): RelayHeartbeatRecord | undefined;
    clear(): void;
    /**
     * Invariant verification: Heartbeat status changes never trigger cognitive task execution.
     */
    static assertHeartbeatNonInterference(taskExecutionAttempted: boolean): void;
}
