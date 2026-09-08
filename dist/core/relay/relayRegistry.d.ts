import type { RelayId, RelaySurfaceType as SurfaceType } from './relayTypes.js';
import { RemoteSessionRecord } from './relaySession.js';
export declare class RelayRegistry {
    private readonly sessions;
    registerSession(session: RemoteSessionRecord): void;
    unregisterSession(sessionId: string): boolean;
    getSession(sessionId: string): RemoteSessionRecord | undefined;
    getAllSessions(): readonly RemoteSessionRecord[];
    getSessionsForUser(userId: string): readonly RemoteSessionRecord[];
    getSessionsForDevice(deviceId: string): readonly RemoteSessionRecord[];
    getSessionsForSurface(surfaceType: SurfaceType): readonly RemoteSessionRecord[];
    getSessionsForRelay(relayId: RelayId): readonly RemoteSessionRecord[];
    count(): number;
    clear(): void;
}
