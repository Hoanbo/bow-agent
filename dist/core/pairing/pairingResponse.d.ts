import type { PairingResponse, PairingOutcome, PairingState, DeviceTrustLevel, ScopedDeviceIdentity } from './pairingTypes.js';
export interface CreatePairingResponseParams {
    readonly outcome: PairingOutcome;
    readonly pairingId: string;
    readonly deviceId: string;
    readonly pairingState: PairingState;
    readonly trustLevel: DeviceTrustLevel;
    readonly scope: ScopedDeviceIdentity;
    readonly sequence: number;
    readonly protocolVersion?: string;
    readonly message?: string;
    readonly timestamp?: number;
}
/**
 * Creates an authoritative immutable PairingResponse.
 */
export declare function createPairingResponse(params: CreatePairingResponseParams): PairingResponse;
