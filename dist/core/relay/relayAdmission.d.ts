import type { AdmissionDecision } from '../admission/admissionTypes.js';
import { ZeroTrustAdmissionRuntime } from '../admission/admissionRuntime.js';
import type { RelayId, RelayEndpointMetadata, RelaySurfaceType as SurfaceType } from './relayTypes.js';
export declare class RelayAdmissionError extends Error {
    constructor(message: string);
}
import type { DeviceProof } from '../deviceIdentity/persistentDeviceTypes.js';
export interface RelayAdmissionParams {
    readonly relayId: RelayId;
    readonly deviceId: string;
    readonly surfaceType: SurfaceType;
    readonly scope: {
        readonly tenantId: string;
        readonly userId: string;
        readonly deviceId: string;
        readonly surfaceId: string;
        readonly brainId: string;
    };
    readonly networkContext: {
        readonly networkType: 'HOME_WIFI' | 'CELLULAR_4G' | 'CELLULAR_5G' | 'PUBLIC_WIFI' | 'HOTSPOT' | 'ETHERNET';
        readonly ipAddress: string;
        readonly ssid?: string;
    };
    readonly endpoint: RelayEndpointMetadata;
    readonly proof?: DeviceProof;
    readonly sessionId?: string;
    readonly isResume?: boolean;
}
/**
 * Bridge between incoming Relay traffic and the authoritative MS-1.3.26 ZeroTrustAdmissionRuntime.
 */
export declare class RelayAdmissionBridge {
    private readonly admissionRuntime;
    constructor(admissionRuntime?: ZeroTrustAdmissionRuntime);
    getAdmissionRuntime(): ZeroTrustAdmissionRuntime;
    /**
     * Evaluates admission for a device connecting via a relay.
     * Maps relay parameters into canonical AdmissionRequest.
     */
    evaluateRelayAdmission(params: RelayAdmissionParams, now?: number): AdmissionDecision;
    /**
     * Solves an issued challenge by signing it with the enrolled device key from keyStore,
     * then re-evaluates admission with the generated DeviceProof.
     */
    solveChallengeAndAdmit(params: RelayAdmissionParams, challenge: any, keyId?: string, now?: number): AdmissionDecision;
    /**
     * Asserts that a device admission decision is an explicit permit.
     * Fails closed if not admitted.
     */
    assertDeviceAdmitted(decision: AdmissionDecision): void;
}
