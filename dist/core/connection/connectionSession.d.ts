import type { ScopedConnectionIdentity, ConnectionCapability } from './connectionTypes.js';
import type { ConnectionState, SessionState } from './connectionStates.js';
import type { AuthState } from './connectionAuthentication.js';
export interface ConnectionSessionSnapshot {
    readonly sessionId: string;
    readonly connectionId: string;
    readonly peerId: string;
    readonly scopeIdentity: ScopedConnectionIdentity;
    readonly authenticationState: AuthState;
    readonly authorizationState: 'UNAUTHORIZED' | 'AUTHORIZED' | 'DENIED';
    readonly grantedCapabilities: readonly ConnectionCapability[];
    readonly sessionState: SessionState;
    readonly connectionState: ConnectionState;
    readonly lastReceivedSequence: number;
    readonly lastSentSequence: number;
    readonly lastAcknowledgedSequence: number;
    readonly heartbeatState: 'NORMAL' | 'WARN' | 'EXPIRED';
    readonly connectionHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    readonly pendingMessageCount: number;
    readonly observationalMetadata: Readonly<{
        readonly createdAt: string;
        readonly lastActiveAt: string;
        readonly totalSent: number;
        readonly totalReceived: number;
    }>;
    readonly fingerprint: string;
}
export interface CreateSessionParams {
    readonly sessionId: string;
    readonly connectionId: string;
    readonly peerId: string;
    readonly scopeIdentity: ScopedConnectionIdentity;
    readonly authenticationState?: AuthState;
    readonly authorizationState?: 'UNAUTHORIZED' | 'AUTHORIZED' | 'DENIED';
    readonly grantedCapabilities?: readonly ConnectionCapability[];
    readonly sessionState?: SessionState;
    readonly connectionState?: ConnectionState;
    readonly lastReceivedSequence?: number;
    readonly lastSentSequence?: number;
    readonly lastAcknowledgedSequence?: number;
    readonly heartbeatState?: 'NORMAL' | 'WARN' | 'EXPIRED';
    readonly connectionHealth?: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    readonly pendingMessageCount?: number;
    readonly observationalMetadata?: {
        readonly createdAt?: string;
        readonly lastActiveAt?: string;
        readonly totalSent?: number;
        readonly totalReceived?: number;
    };
}
/**
 * Creates an immutable, deterministic ConnectionSessionSnapshot
 */
export declare function createConnectionSessionSnapshot(params: CreateSessionParams): Readonly<ConnectionSessionSnapshot>;
