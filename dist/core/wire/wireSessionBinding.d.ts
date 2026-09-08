import type { ScopedRelayIdentity, RemoteSession } from '../relay/relayTypes.js';
export interface WireSessionBinding {
    readonly connectionId: string;
    readonly sessionId: string;
    readonly deviceId: string;
    readonly surfaceId: string;
    readonly relayId: string;
    readonly brainId: string;
    readonly scope: ScopedRelayIdentity;
    readonly boundAt: number;
}
export declare class WireSessionBinder {
    private connToBinding;
    private sessionToConn;
    /**
     * Binds an active wire connection to an admitted remote session.
     */
    bind(connectionId: string, session: RemoteSession): WireSessionBinding;
    /**
     * Unbinds an active wire connection.
     */
    unbind(connectionId: string): WireSessionBinding | undefined;
    getBinding(connectionId: string): WireSessionBinding | undefined;
    getConnectionForSession(sessionId: string): string | undefined;
    /**
     * Validates that an incoming wire envelope's scope matches the bound connection scope.
     * Rejects any cross-boundary tampering fail-closed.
     */
    validateScopeMatch(connectionId: string, incomingScope: ScopedRelayIdentity): void;
    clear(): void;
}
