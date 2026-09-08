import { WebSocket } from 'ws';
import type { WireEndpointMetadata, WireFrame, WireConnectionMetrics } from '../wireTypes.js';
import type { WireConnectionState } from '../wireStates.js';
import type { WireConnection, WireClientTransportAdapter, WireServerTransportAdapter } from '../wireTransport.js';
import { WireTransportError } from '../wireFailure.js';
export declare class WebSocketWireConnection implements WireConnection {
    readonly connectionId: string;
    readonly endpoint: WireEndpointMetadata;
    private readonly ws;
    state: WireConnectionState;
    private frameHandler?;
    private errorHandler?;
    private closeHandler?;
    private bytesSent;
    private bytesReceived;
    private framesSent;
    private framesReceived;
    private droppedFrames;
    private readonly connectedAt;
    private lastActivityAt;
    constructor(connectionId: string, endpoint: WireEndpointMetadata, ws: WebSocket);
    private setupSocketListeners;
    send(frame: WireFrame): Promise<void>;
    onFrame(handler: (frame: WireFrame) => void): void;
    onError(handler: (err: WireTransportError) => void): void;
    onClose(handler: (reason?: string) => void): void;
    close(reason?: string): Promise<void>;
    setState(newState: WireConnectionState, reason?: string): void;
    getMetrics(): WireConnectionMetrics;
}
export declare class WebSocketWireServerAdapter implements WireServerTransportAdapter {
    readonly adapterType = "REAL_WEBSOCKET";
    private wss?;
    private listeningEndpoint?;
    private connectionHandler?;
    private activeConnections;
    listen(port?: number, host?: string): Promise<WireEndpointMetadata>;
    onConnection(handler: (connection: WireConnection) => void): void;
    close(): Promise<void>;
    getActiveConnections(): readonly WireConnection[];
    getListeningEndpoint(): WireEndpointMetadata | undefined;
}
export declare class WebSocketWireClientAdapter implements WireClientTransportAdapter {
    readonly adapterType = "REAL_WEBSOCKET";
    connect(endpoint: WireEndpointMetadata): Promise<WireConnection>;
}
