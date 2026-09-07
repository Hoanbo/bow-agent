import type { ScopedConnectionIdentity } from './connectionTypes.js';
import type { ConnectionSessionSnapshot } from './connectionSession.js';
export interface ConnectionReconnectRequest {
    readonly reconnectId: string;
    readonly scope: string;
    readonly scopeIdentity: ScopedConnectionIdentity;
    readonly sessionId: string;
    readonly peerId: string;
    readonly lastReceivedSequence: number;
    readonly lastSentSequence: number;
    readonly fingerprint: string;
}
export interface ConnectionReconnectResult {
    readonly accepted: boolean;
    readonly sessionId: string;
    readonly resumeSequence: number;
    readonly error?: string;
    readonly fingerprint: string;
}
/**
 * Creates an immutable ConnectionReconnectRequest
 */
export declare function createConnectionReconnectRequest(identity: ScopedConnectionIdentity, sessionId: string, peerId: string, lastReceivedSequence: number, lastSentSequence: number): Readonly<ConnectionReconnectRequest>;
/**
 * Evaluates reconnection request against previous session snapshot
 */
export declare function evaluateConnectionReconnect(prevSnapshot: ConnectionSessionSnapshot, req: ConnectionReconnectRequest): Readonly<ConnectionReconnectResult>;
