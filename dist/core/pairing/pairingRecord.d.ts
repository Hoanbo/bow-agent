import type { PairingRecord, TrustRecord, ScopedDeviceIdentity, DeviceType, PairingState, DeviceTrustLevel, SafeDeviceCapability } from './pairingTypes.js';
export interface CreatePairingRecordParams {
    readonly deviceId: string;
    readonly deviceType: DeviceType;
    readonly surfaceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly capabilities: readonly SafeDeviceCapability[];
    readonly deviceFingerprint: string;
    readonly pairingState?: PairingState;
    readonly trustLevel?: DeviceTrustLevel;
    readonly sequence?: number;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly timestamp?: number;
}
/**
 * Creates an authoritative immutable PairingRecord.
 */
export declare function createPairingRecord(params: CreatePairingRecordParams): PairingRecord;
/**
 * Creates an authoritative immutable TrustRecord.
 */
export declare function createTrustRecord(pairingRecord: PairingRecord, trustLevel?: DeviceTrustLevel, timestamp?: number): TrustRecord;
/**
 * Updates the pairing state and trust level of an existing PairingRecord, enforcing valid transitions.
 */
export declare function updatePairingRecordState(record: PairingRecord, nextState: PairingState, nextTrust?: DeviceTrustLevel, updates?: Partial<PairingRecord>, timestamp?: number): PairingRecord;
/**
 * Revokes a pairing record authoritatively.
 */
export declare function revokePairingRecord(record: PairingRecord, revokedBy: string, reason: string, timestamp?: number): PairingRecord;
