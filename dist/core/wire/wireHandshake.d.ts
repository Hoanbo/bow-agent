import type { WireHandshakeRequest, WireHandshakeResponse, WireSurfaceType } from './wireTypes.js';
export declare const HANDSHAKE_TIMEOUT_MS = 5000;
export declare const MAX_FRAME_SIZE_BYTES = 1048576;
export declare const DEFAULT_HEARTBEAT_INTERVAL_MS = 15000;
export interface HandshakeServerOptions {
    readonly gatewayId: string;
    readonly supportedVersions?: readonly string[];
    readonly heartbeatIntervalMs?: number;
    readonly maxFrameSize?: number;
    readonly challengeGenerator?: (deviceId: string) => string;
}
export declare class WireHandshakeCoordinator {
    private readonly options?;
    private readonly supportedVersions;
    private readonly heartbeatIntervalMs;
    private readonly maxFrameSize;
    constructor(options?: HandshakeServerOptions | undefined);
    /**
     * Client-side: Creates the initial handshake request.
     */
    createClientRequest(params: {
        deviceId: string;
        surfaceId: string;
        surfaceType: WireSurfaceType;
        capabilities?: readonly string[];
    }): WireHandshakeRequest;
    /**
     * Gateway/Server-side: Validates client request and returns response/challenge.
     */
    evaluateServerRequest(request: WireHandshakeRequest, assignedConnectionId: string, assignedSessionId?: string): WireHandshakeResponse;
    /**
     * Client-side: Validates server response to handshake request.
     */
    verifyServerResponse(request: WireHandshakeRequest, response: WireHandshakeResponse): void;
}
