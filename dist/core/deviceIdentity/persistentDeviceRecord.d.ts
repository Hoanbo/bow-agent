import type { PersistentDeviceTrustRecord, PersistentDeviceState, DeviceRecognitionPolicy } from './persistentDeviceTypes.js';
import type { DeviceType, DeviceTrustLevel, SafeDeviceCapability, ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
export declare const DEFAULT_RECOGNITION_POLICY: DeviceRecognitionPolicy;
export interface CreatePersistentDeviceTrustRecordParams {
    readonly deviceId: string;
    readonly userId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly pairingId: string;
    readonly trustId: string;
    readonly deviceType: DeviceType;
    readonly scope: ScopedDeviceIdentity;
    readonly publicKeyId: string;
    readonly keyVersion?: number;
    readonly trustLevel?: DeviceTrustLevel;
    readonly lifecycleState?: PersistentDeviceState;
    readonly capabilityEnvelope: readonly SafeDeviceCapability[];
    readonly recognitionPolicy?: DeviceRecognitionPolicy;
    readonly expiresAt?: number;
    readonly timestamp?: number;
}
/**
 * Creates an authoritative immutable PersistentDeviceTrustRecord.
 */
export declare function createPersistentDeviceTrustRecord(params: CreatePersistentDeviceTrustRecordParams): PersistentDeviceTrustRecord;
/**
 * Updates the lifecycle state of a PersistentDeviceTrustRecord, asserting valid transition.
 */
export declare function updatePersistentDeviceTrustRecord(record: PersistentDeviceTrustRecord, nextState: PersistentDeviceState, updates?: Partial<PersistentDeviceTrustRecord>, timestamp?: number): PersistentDeviceTrustRecord;
/**
 * Authoritatively revokes a persistent device trust record.
 */
export declare function revokePersistentDeviceTrustRecord(record: PersistentDeviceTrustRecord, reason: string, timestamp?: number): PersistentDeviceTrustRecord;
/**
 * Marks a persistent device trust record as requiring key rotation.
 */
export declare function markPersistentDeviceRotationRequired(record: PersistentDeviceTrustRecord, timestamp?: number): PersistentDeviceTrustRecord;
export declare const createPersistentDeviceRecord: typeof createPersistentDeviceTrustRecord;
export declare const transitionDeviceRecordState: typeof updatePersistentDeviceTrustRecord;
export type CreatePersistentDeviceRecordParams = CreatePersistentDeviceTrustRecordParams;
