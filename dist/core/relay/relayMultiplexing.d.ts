import type { RelayMessage } from './relayTypes.js';
import { RemoteSessionRecord } from './relaySession.js';
export declare class RelayMultiplexingError extends Error {
    constructor(message: string);
}
export declare class RelayMultiplexer {
    private readonly sessions;
    registerSession(session: RemoteSessionRecord): void;
    unregisterSession(sessionId: string): boolean;
    getSession(sessionId: string): RemoteSessionRecord | undefined;
    getActiveSessions(): readonly RemoteSessionRecord[];
    getSessionsForDevice(deviceId: string): readonly RemoteSessionRecord[];
    /**
     * Routes an inbound message to its registered isolated session.
     * Enforces strict defense against cross-tenant, cross-user, cross-device,
     * cross-surface, and cross-Brain injection.
     */
    routeInbound(message: RelayMessage): RemoteSessionRecord;
    clear(): void;
}
