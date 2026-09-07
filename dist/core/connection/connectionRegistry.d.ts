import type { ScopedConnectionIdentity } from './connectionTypes.js';
import type { ConnectionSessionSnapshot } from './connectionSession.js';
export interface RegisteredPeer {
    readonly peerId: string;
    readonly scopeIdentity: ScopedConnectionIdentity;
    readonly role: string;
    readonly registeredAt: string;
}
export interface RegisteredAdapterBinding {
    readonly adapterId: string;
    readonly transportType: string;
    readonly supportedSurfaces: readonly string[];
    readonly registeredAt: string;
}
export declare class ConnectionRegistry {
    private readonly connections;
    private readonly peers;
    private readonly adapterBindings;
    private readonly surfaceToConnection;
    /**
     * Registers or updates a connection session snapshot
     */
    registerConnection(snapshot: ConnectionSessionSnapshot): void;
    /**
     * Retrieves a connection session snapshot by connectionId, enforcing expected scope
     */
    getConnection(connectionId: string, expectedScope?: ScopedConnectionIdentity): ConnectionSessionSnapshot | undefined;
    /**
     * Registers a peer identity
     */
    registerPeer(peer: RegisteredPeer): void;
    /**
     * Retrieves a peer by ID, enforcing expected scope
     */
    getPeer(peerId: string, expectedScope?: ScopedConnectionIdentity): RegisteredPeer | undefined;
    /**
     * Registers an adapter binding
     */
    registerAdapterBinding(binding: RegisteredAdapterBinding): void;
    /**
     * Retrieves an adapter binding
     */
    getAdapterBinding(adapterId: string): RegisteredAdapterBinding | undefined;
    /**
     * Finds connection ID for a given surface
     */
    getConnectionForSurface(surfaceId: string): string | undefined;
    /**
     * Removes a connection from the registry
     */
    removeConnection(connectionId: string): boolean;
    /**
     * Total registered connection count
     */
    get connectionCount(): number;
    clear(): void;
}
