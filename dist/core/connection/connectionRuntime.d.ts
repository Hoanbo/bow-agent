import type { ScopedConnectionIdentity, ConnectionCapability } from './connectionTypes.js';
import { type ConnectionAuthCredentials } from './connectionAuthentication.js';
import { type ConnectionSessionSnapshot } from './connectionSession.js';
import { type ConnectionMessage } from './connectionMessage.js';
import { type ConnectionHeartbeatSignal, type ConnectionHeartbeatAck } from './connectionHeartbeat.js';
import { type ConnectionReconnectRequest, type ConnectionReconnectResult } from './connectionReconnect.js';
import { ConnectionAuditLedger } from './connectionAudit.js';
import { ConnectionRegistry } from './connectionRegistry.js';
import type { NetworkConnectionAdapter } from './connectionInMemoryAdapter.js';
export declare class ConnectionRuntime {
    private readonly registry;
    private readonly adapters;
    private readonly sequenceTrackers;
    private readonly replayDetectors;
    private readonly auditLedger;
    private readonly outboundQueues;
    private readonly messageListeners;
    constructor();
    getRegistry(): ConnectionRegistry;
    getAuditLedger(): ConnectionAuditLedger;
    getConnection(connectionId: string): ConnectionSessionSnapshot | undefined;
    registerAdapter(adapter: NetworkConnectionAdapter, supportedSurfaces: readonly string[]): void;
    /**
     * Initiates a new connection establishing INITIALIZING -> CONNECTING -> CONNECTED
     */
    createConnection(identity: ScopedConnectionIdentity): Promise<ConnectionSessionSnapshot>;
    /**
     * Executes authoritative handshake negotiation:
     * CONNECTED -> AUTHENTICATING -> AUTHENTICATED -> AUTHORIZING -> AUTHORIZED -> READY
     */
    performHandshake(identity: ScopedConnectionIdentity, requestedCaps: readonly ConnectionCapability[], creds: ConnectionAuthCredentials): Promise<ConnectionSessionSnapshot>;
    /**
     * Dispatches an outbound message across the connection runtime
     */
    sendMessage(message: ConnectionMessage): Promise<void>;
    /**
     * Processes an inbound message arriving from the network adapter
     */
    receiveMessage(message: ConnectionMessage): Promise<void>;
    onMessage(handler: (msg: ConnectionMessage) => Promise<void> | void): void;
    /**
     * Sends heartbeat signal
     */
    sendHeartbeat(connectionId: string): Promise<ConnectionHeartbeatSignal>;
    /**
     * Receives heartbeat ack
     */
    receiveHeartbeatAck(connectionId: string, ack: ConnectionHeartbeatAck): Promise<void>;
    /**
     * Reconnects and resumes a suspended connection session
     */
    reconnect(req: ConnectionReconnectRequest): Promise<ConnectionReconnectResult>;
    /**
     * Gracefully disconnects a connection
     */
    disconnect(connectionId: string): Promise<void>;
    /**
     * Shuts down all connections and adapters
     */
    shutdown(): Promise<void>;
}
