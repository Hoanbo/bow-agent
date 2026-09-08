import type { PersistentDeviceTrustRecord, DeviceChallenge, DeviceProof, DeviceRecognitionResult } from './persistentDeviceTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { PersistentDeviceStore } from './persistentDeviceStorage.js';
import type { DeviceKeyStore } from './persistentDeviceKey.js';
export interface RecognizeDeviceInput {
    readonly deviceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly challenge?: DeviceChallenge;
    readonly proof?: DeviceProof;
    readonly currentTime?: number;
}
export interface AttemptDeviceRecognitionParams {
    readonly record: PersistentDeviceTrustRecord;
    readonly challenge: DeviceChallenge;
    readonly proof: DeviceProof;
    readonly targetScope: ScopedDeviceIdentity;
    readonly keyStore: DeviceKeyStore;
    readonly store?: PersistentDeviceStore;
    readonly currentTime?: number;
}
/**
 * Executes authoritative passwordless device recognition.
 * Fails closed on missing records, unverified proofs, expired challenges, or revoked trust.
 */
export declare function recognizePersistentDevice(store: PersistentDeviceStore, keyStore: DeviceKeyStore, input: RecognizeDeviceInput): DeviceRecognitionResult;
export declare function attemptDeviceRecognition(paramsOrStore: AttemptDeviceRecognitionParams | PersistentDeviceStore, maybeKeyStore?: DeviceKeyStore, maybeInput?: RecognizeDeviceInput): DeviceRecognitionResult;
