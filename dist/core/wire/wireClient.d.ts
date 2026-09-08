import type { WireEndpointMetadata, WireEnvelope, WireMessageCategory, WireRiskLevel, WireSurfaceType, WireMessagePriority } from './wireTypes.js';
import type { WireConnectionState } from './wireStates.js';
import type { WireClientTransportAdapter } from './wireTransport.js';
import { WireHandshakeCoordinator } from './wireHandshake.js';
import { WireAdmissionBridge } from './wireAdmissionBridge.js';
import { WireReconnectScheduler } from './wireReconnect.js';
import type { NetworkType } from '../admission/admissionTypes.js';
export interface WireClientOptions {
    readonly deviceId: string;
    readonly surfaceId: string;
    readonly surfaceType: WireSurfaceType;
    readonly tenantId: string;
    readonly userId: string;
    readonly brainId: string;
    readonly relayId: string;
    readonly transportAdapter: WireClientTransportAdapter;
    readonly admissionBridge?: WireAdmissionBridge;
    readonly handshakeCoordinator?: WireHandshakeCoordinator;
    readonly reconnectScheduler?: WireReconnectScheduler;
}
export declare class RealWireClient {
    state: WireConnectionState;
    private connection?;
    private currentSessionId?;
    private sequenceCounter;
    private envelopeHandlers;
    private readonly deviceId;
    private readonly surfaceId;
    private readonly surfaceType;
    private readonly tenantId;
    private readonly userId;
    private readonly brainId;
    private readonly relayId;
    private readonly transportAdapter;
    private readonly admissionBridge;
    private readonly handshakeCoordinator;
    private readonly reconnectScheduler;
    constructor(options: WireClientOptions);
    connect(endpoint: WireEndpointMetadata): Promise<void>;
    sendEnvelope<T>(params: {
        messageCategory: WireMessageCategory;
        payload: T;
        priority?: WireMessagePriority;
        riskLevel?: WireRiskLevel;
        correlationId?: string;
    }): Promise<void>;
    onEnvelope(handler: (envelope: WireEnvelope) => void): void;
    /**
     * Simulates network roaming to another network (e.g. WiFi -> 4G -> 5G).
     * Device identity remains invariant! RECONNECT != RE-EXECUTE.
     */
    roamToNetwork(params: {
        newNetworkType: NetworkType;
        newIp: string;
        endpoint: WireEndpointMetadata;
    }): Promise<void>;
    close(reason?: string): Promise<void>;
    getSessionId(): string | undefined;
    getDeviceId(): string;
    private transitionState;
}
