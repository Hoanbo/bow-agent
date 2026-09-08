import type { WireEndpointMetadata, WireFrame, WireConnectionMetrics, WireTransportType } from './wireTypes.js';
import type { WireConnectionState } from './wireStates.js';
import type { WireTransportError } from './wireFailure.js';
/**
 * Bidirectional physical wire connection contract.
 */
export interface WireConnection {
    readonly connectionId: string;
    readonly state: WireConnectionState;
    readonly endpoint: WireEndpointMetadata;
    send(frame: WireFrame): Promise<void>;
    onFrame(handler: (frame: WireFrame) => void): void;
    onError(handler: (err: WireTransportError) => void): void;
    onClose(handler: (reason?: string) => void): void;
    close(reason?: string): Promise<void>;
    getMetrics(): WireConnectionMetrics;
    /** Explicit state transition — used by gateway orchestration and tests. */
    setState(newState: WireConnectionState, reason?: string): void;
}
/**
 * Client-side transport adapter contract for establishing outbound wire connections.
 */
export interface WireClientTransportAdapter {
    readonly adapterType: WireTransportType;
    connect(endpoint: WireEndpointMetadata): Promise<WireConnection>;
}
/**
 * Server/Gateway transport adapter contract for accepting inbound wire connections.
 */
export interface WireServerTransportAdapter {
    readonly adapterType: WireTransportType;
    listen(port: number, host?: string): Promise<WireEndpointMetadata>;
    onConnection(handler: (connection: WireConnection) => void): void;
    close(): Promise<void>;
    getActiveConnections(): readonly WireConnection[];
    getListeningEndpoint(): WireEndpointMetadata | undefined;
}
