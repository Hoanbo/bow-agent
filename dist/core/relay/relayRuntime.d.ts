import type { RelayId, RelayRegistration, RemoteSession, RelayMessage, RelayRuntimeSnapshot, RelaySurfaceType as SurfaceType, RelayEndpointMetadata } from './relayTypes.js';
import type { DeviceProof } from '../deviceIdentity/persistentDeviceTypes.js';
import { RelayRegistrationManager } from './relayRegistration.js';
import { RelayAdmissionBridge } from './relayAdmission.js';
import { RelayMultiplexer } from './relayMultiplexing.js';
import { RelayHeartbeatTracker } from './relayHeartbeat.js';
import { RelayReconnectScheduler } from './relayReconnect.js';
import { RelayResumeCoordinator } from './relayResume.js';
import { RelayMessageRouter } from './relayRouting.js';
import { RelayBackpressureController } from './relayBackpressure.js';
import { RelayAuditLedger } from './relayAudit.js';
import { RelayRegistry } from './relayRegistry.js';
export interface SecureBrainRelayRuntimeOptions {
    readonly registrationManager?: RelayRegistrationManager;
    readonly admissionBridge?: RelayAdmissionBridge;
    readonly multiplexer?: RelayMultiplexer;
    readonly heartbeatTracker?: RelayHeartbeatTracker;
    readonly reconnectScheduler?: RelayReconnectScheduler;
    readonly resumeCoordinator?: RelayResumeCoordinator;
    readonly router?: RelayMessageRouter;
    readonly backpressureController?: RelayBackpressureController;
    readonly auditLedger?: RelayAuditLedger;
    readonly registry?: RelayRegistry;
}
export declare class SecureBrainRelayRuntime {
    private readonly registrationManager;
    private readonly admissionBridge;
    private readonly multiplexer;
    private readonly heartbeatTracker;
    private readonly reconnectScheduler;
    private readonly resumeCoordinator;
    private readonly router;
    private readonly backpressureController;
    private readonly auditLedger;
    private readonly registry;
    private totalReconnections;
    private totalResumptions;
    private totalRoamingEvents;
    constructor(options?: SecureBrainRelayRuntimeOptions);
    getRegistrationManager(): RelayRegistrationManager;
    getAdmissionBridge(): RelayAdmissionBridge;
    getMultiplexer(): RelayMultiplexer;
    getHeartbeatTracker(): RelayHeartbeatTracker;
    getReconnectScheduler(): RelayReconnectScheduler;
    getResumeCoordinator(): RelayResumeCoordinator;
    getRouter(): RelayMessageRouter;
    getBackpressureController(): RelayBackpressureController;
    getAuditLedger(): RelayAuditLedger;
    getRegistry(): RelayRegistry;
    /**
     * Registers a Relay instance with the Brain infrastructure.
     */
    registerRelay(reg: RelayRegistration): void;
    /**
     * Establishes a remote session for an admitted device connecting via an active relay.
     */
    establishSession(params: {
        sessionId: string;
        relayId: RelayId;
        deviceId: string;
        surfaceType: SurfaceType;
        scope: {
            tenantId: string;
            userId: string;
            surfaceId: string;
            brainId: string;
        };
        networkContext: {
            networkType: 'HOME_WIFI' | 'CELLULAR_4G' | 'CELLULAR_5G' | 'PUBLIC_WIFI' | 'HOTSPOT' | 'ETHERNET';
            ipAddress: string;
            ssid?: string;
        };
        endpoint: RelayEndpointMetadata;
        proof?: DeviceProof;
        connectionId?: string;
        gatewayId?: string;
    }): Promise<RemoteSession>;
    /**
     * Handles network roaming (e.g. Home Wi-Fi -> 4G -> 5G -> Public Wi-Fi)
     * The device identity MUST NOT change when roaming across networks.
     */
    handleNetworkRoaming(sessionId: string, newNetwork: {
        networkType: 'HOME_WIFI' | 'CELLULAR_4G' | 'CELLULAR_5G' | 'PUBLIC_WIFI' | 'HOTSPOT' | 'ETHERNET';
        ipAddress: string;
        ssid?: string;
    }): {
        session: RemoteSession;
        roamingDetected: boolean;
    };
    /**
     * Routes an application message through backpressure and router.
     */
    routeMessage(message: RelayMessage): RelayMessage;
    /**
     * Records a heartbeat and updates session activity.
     */
    recordHeartbeat(relayId: RelayId, sessionId: string, rttMs: number): void;
    /**
     * Performs a bounded, state-aware reconnection attempt.
     * INVARIANT: RECONNECT != RE-EXECUTE.
     */
    reconnectSession(sessionId: string): {
        reconnected: boolean;
        delayMs?: number;
        error?: string;
    };
    /**
     * Resumes an existing remote session with sequence continuity and token validation.
     * INVARIANT: SESSION_RESUME != TASK_RESUME.
     */
    resumeSession(params: {
        sessionId: string;
        resumeToken: string;
        clientLastAckSeq: number;
        clientNextSeq: number;
        now?: number;
    }): RemoteSession;
    /**
     * Gracefully terminates an active remote session.
     */
    terminateSession(sessionId: string, reason?: string): void;
    /**
     * Diagnostic runtime snapshot.
     */
    getSnapshot(): RelayRuntimeSnapshot;
    /**
     * Static architectural verification confirming boundary non-interference.
     */
    static verifyArchitecturalNonInterference(): {
        callsLLM: false;
        executesTools: false;
        mutatesBrainMemory: false;
        controlsActuators: false;
        bypassesPDP: false;
        isCognitiveAuthority: false;
    };
}
