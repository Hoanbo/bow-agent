import type { DeviceProof } from '../deviceIdentity/persistentDeviceTypes.js';
import type { AdmissionDecision, EndpointMetadata, NetworkMetadata } from '../admission/admissionTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { ZeroTrustAdmissionRuntime } from '../admission/admissionRuntime.js';
import { DeviceVaultRuntime } from '../deviceVault/deviceVaultRuntime.js';
export interface WireAdmissionBridgeOptions {
    readonly admissionRuntime?: ZeroTrustAdmissionRuntime;
    readonly deviceVaultRuntime?: DeviceVaultRuntime;
}
export declare class WireAdmissionBridge {
    private readonly admissionRuntime;
    private readonly deviceVaultRuntime;
    constructor(options?: WireAdmissionBridgeOptions);
    getAdmissionRuntime(): ZeroTrustAdmissionRuntime;
    getDeviceVaultRuntime(): DeviceVaultRuntime;
    /**
     * Client-Side: Generates a cryptographic DeviceProof solving the gateway challenge
     * using the local DeviceKeyStore without exposing the raw private key.
     */
    generateProofForChallenge(deviceId: string, challengeToken: string, keyId?: string): DeviceProof;
    /**
     * Gateway/Server-Side: Evaluates admission for an incoming wire connection.
     */
    evaluateWireAdmission(params: {
        deviceId: string;
        surfaceType: string;
        surfaceId: string;
        scope: ScopedDeviceIdentity;
        endpoint: EndpointMetadata;
        network: NetworkMetadata;
        proof?: DeviceProof;
        sessionId?: string;
        isResume?: boolean;
    }): Promise<AdmissionDecision>;
}
