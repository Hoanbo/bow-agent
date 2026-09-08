import type { WireEndpointMetadata, WireFrame, WireConnectionMetrics } from '../wireTypes.js';
import type { WireConnectionState } from '../wireStates.js';
import type { WireConnection, WireClientTransportAdapter, WireServerTransportAdapter } from '../wireTransport.js';
import { WireTransportError } from '../wireFailure.js';
export declare class InMemoryWireConnection implements WireConnection {
    readonly connectionId: string;
    readonly endpoint: WireEndpointMetadata;
    state: WireConnectionState;
    private frameHandler?;
    private errorHandler?;
    private closeHandler?;
    private peer?;
    private bytesSent;
    private bytesReceived;
    private framesSent;
    private framesReceived;
    private droppedFrames;
    private readonly connectedAt;
    private lastActivityAt;
    constructor(connectionId: string, endpoint: WireEndpointMetadata);
    setPeer(peer: InMemoryWireConnection): void;
    send(frame: WireFrame): Promise<void>;
    deliverInbound(frame: WireFrame, byteCount: number): void;
    onFrame(handler: (frame: WireFrame) => void): void;
    onError(handler: (err: WireTransportError) => void): void;
    onClose(handler: (reason?: string) => void): void;
    close(reason?: string): Promise<void>;
    setState(newState: WireConnectionState, reason?: string): void;
    getMetrics(): WireConnectionMetrics;
}
export declare class InMemoryWireServerAdapter implements WireServerTransportAdapter {
    readonly adapterType = "TEST_IN_MEMORY";
    private listeningEndpoint?;
    private connectionHandler?;
    private activeConnections;
    listen(port: number, host?: string): Promise<WireEndpointMetadata>;
    onConnection(handler: (connection: WireConnection) => void): void;
    close(): Promise<void>;
    getActiveConnections(): readonly WireConnection[];
    getListeningEndpoint(): WireEndpointMetadata | undefined;
    /**
     * Connects an in-memory client to this server.
     */
    acceptClient(clientConn: InMemoryWireConnection): InMemoryWireConnection;
}
export declare class InMemoryWireClientAdapter implements WireClientTransportAdapter {
    private readonly serverAdapter?;
    readonly adapterType = "TEST_IN_MEMORY";
    constructor(serverAdapter?: InMemoryWireServerAdapter | undefined);
    connect(endpoint: WireEndpointMetadata): Promise<WireConnection>;
}
