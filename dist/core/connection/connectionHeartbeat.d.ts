import type { ScopedConnectionIdentity } from './connectionTypes.js';
export interface ConnectionHeartbeatSignal {
    readonly heartbeatId: string;
    readonly scope: string;
    readonly sequence: number;
    readonly sentAt: string;
    readonly fingerprint: string;
}
export interface ConnectionHeartbeatAck {
    readonly heartbeatId: string;
    readonly ackedSequence: number;
    readonly scope: string;
    readonly ackedAt: string;
    readonly fingerprint: string;
}
export interface ConnectionHeartbeatHealthStatus {
    readonly health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    readonly isTimedOut: boolean;
    readonly roundTripLatencyMs?: number;
}
export type HeartbeatHealthStatus = ConnectionHeartbeatHealthStatus;
/**
 * Creates an immutable ConnectionHeartbeatSignal
 */
export declare function createConnectionHeartbeatSignal(identity: ScopedConnectionIdentity, sequence: number, sentAt?: string): Readonly<ConnectionHeartbeatSignal>;
/**
 * Creates an immutable ConnectionHeartbeatAck acknowledging a signal
 */
export declare function createConnectionHeartbeatAck(signal: ConnectionHeartbeatSignal, ackedAt?: string): Readonly<ConnectionHeartbeatAck>;
/**
 * Evaluates heartbeat health based on elapsed time without ack
 */
export declare function evaluateConnectionHeartbeat(lastSentTime: number, lastAckTime: number, currentTime: number, warnThresholdMs?: number, timeoutThresholdMs?: number): HeartbeatHealthStatus;
