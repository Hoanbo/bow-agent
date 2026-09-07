import type { ScopedConnectionIdentity } from './connectionTypes.js';
export declare const TIMEOUT_CATEGORIES: readonly ["CONNECT_TIMEOUT", "HANDSHAKE_TIMEOUT", "AUTH_TIMEOUT", "AUTHORIZATION_TIMEOUT", "IDLE_TIMEOUT", "HEARTBEAT_TIMEOUT", "MESSAGE_TIMEOUT", "RECONNECT_TIMEOUT"];
export type ConnectionTimeoutCategory = (typeof TIMEOUT_CATEGORIES)[number];
export interface ConnectionTimeoutDescriptor {
    readonly timeoutId: string;
    readonly scope: string;
    readonly category: ConnectionTimeoutCategory;
    readonly elapsedMs: number;
    readonly thresholdMs: number;
    readonly occurredAt: string;
    readonly fingerprint: string;
}
/**
 * Creates an immutable, deterministic ConnectionTimeoutDescriptor
 */
export declare function createConnectionTimeoutDescriptor(identity: ScopedConnectionIdentity, category: ConnectionTimeoutCategory, elapsedMs: number, thresholdMs: number, occurredAt?: string): Readonly<ConnectionTimeoutDescriptor>;
/**
 * Evaluates whether elapsed time has exceeded thresholdMs
 */
export declare function hasTimedOut(startTimeMs: number, currentTimeMs: number, thresholdMs: number): boolean;
