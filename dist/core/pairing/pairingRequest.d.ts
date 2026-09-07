import type { PairingRequest, ScopedDeviceIdentity, DeviceType, DeviceTrustLevel, SafeDeviceCapability } from './pairingTypes.js';
export interface CreatePairingRequestParams {
    readonly deviceId: string;
    readonly deviceType: DeviceType;
    readonly surfaceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly capabilities: readonly SafeDeviceCapability[];
    readonly deviceFingerprint: string;
    readonly requestedTrustLevel?: DeviceTrustLevel;
    readonly sequence: number;
    readonly nonce: string;
    readonly protocolVersion?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Creates a canonical, immutable PairingRequest.
 */
export declare function createPairingRequest(params: CreatePairingRequestParams): PairingRequest;
/**
 * Authoritatively validates a PairingRequest against security boundaries.
 * Fails closed with typed error on any malformed or unpermitted field.
 */
export declare function validatePairingRequest(req: PairingRequest): void;
