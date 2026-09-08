import type { RelayEndpointMetadata, RelayMessage } from './relayTypes.js';
export interface RelayTransportAdapter {
    readonly adapterType: 'TEST_IN_MEMORY' | 'WEBSOCKET_CLIENT' | 'QUIC_CLIENT' | 'TCP_CLIENT';
    open(endpoint: RelayEndpointMetadata): Promise<void>;
    close(): Promise<void>;
    send(message: RelayMessage): Promise<void>;
    onMessage(handler: (msg: RelayMessage) => void): void;
    isConnected(): boolean;
}
/**
 * TEST / IN-MEMORY transport adapter.
 * NOT a production network socket or internet tunnel.
 */
export declare class InMemoryRelayTransportAdapter implements RelayTransportAdapter {
    readonly adapterType = "TEST_IN_MEMORY";
    private connected;
    private messageHandler?;
    sentMessages: RelayMessage[];
    open(_endpoint: RelayEndpointMetadata): Promise<void>;
    close(): Promise<void>;
    send(message: RelayMessage): Promise<void>;
    onMessage(handler: (msg: RelayMessage) => void): void;
    isConnected(): boolean;
    /**
     * Helper for testing inbound message reception.
     */
    receiveInbound(msg: RelayMessage): void;
    clear(): void;
}
/**
 * Encapsulates a transport connection instance.
 */
export declare class RelayConnection {
    readonly connectionId: string;
    readonly endpoint: RelayEndpointMetadata;
    private readonly adapter;
    private connected;
    private bytesSent;
    private bytesReceived;
    private openedAt?;
    private closedAt?;
    constructor(connectionId: string, endpoint: RelayEndpointMetadata, adapter: RelayTransportAdapter);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    send(message: RelayMessage): Promise<void>;
    onMessage(handler: (msg: RelayMessage) => void): void;
    getStats(): {
        connectionId: string;
        connected: boolean;
        bytesSent: number;
        bytesReceived: number;
        openedAt: number | undefined;
        closedAt: number | undefined;
    };
}
