import type { DeviceTrustLevel, SafeDeviceCapability, ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { PersistentDeviceTrustRecord, DeviceKeyMetadata, DeviceChallenge, DeviceProof, DeviceRecognitionResult, DeviceRehydrationResult, DeviceRevocationResult, DeviceKeyRotationResult, DeviceRecognitionPolicy } from './persistentDeviceTypes.js';
import { PersistentDeviceRegistry } from './persistentDeviceRegistry.js';
import { PersistentDeviceStore } from './persistentDeviceStorage.js';
import { DeviceKeyStore } from './persistentDeviceKey.js';
import { PersistentDeviceAuditLedger } from './persistentDeviceAudit.js';
import { type PersistentDeviceEnrollmentMetadata } from './persistentDeviceIdentity.js';
export interface EnrollPersistentDeviceParams {
    readonly metadata: PersistentDeviceEnrollmentMetadata;
    readonly scope: ScopedDeviceIdentity;
    readonly capabilities: readonly SafeDeviceCapability[];
    readonly trustLevel: DeviceTrustLevel;
    readonly userId?: string;
    readonly brainId?: string;
    readonly surfaceId?: string;
    readonly pairingId?: string;
    readonly trustId?: string;
    readonly recognitionPolicy?: Partial<DeviceRecognitionPolicy>;
    readonly algorithm?: string;
}
export declare class PersistentDeviceIdentityRuntime {
    private readonly registry;
    private readonly store;
    private readonly keyStore;
    private readonly auditLedger;
    constructor(options?: {
        registry?: PersistentDeviceRegistry;
        store?: PersistentDeviceStore;
        keyStore?: DeviceKeyStore;
        auditLedger?: PersistentDeviceAuditLedger;
    });
    getRegistry(): PersistentDeviceRegistry;
    getStore(): PersistentDeviceStore;
    getKeyStore(): DeviceKeyStore;
    getAuditLedger(): PersistentDeviceAuditLedger;
    /**
     * Enrolls a device: creates persistent device identity, key material (v1),
     * trust record, stores in registry & storage, and records scrubbed audit.
     */
    enrollDevice(params: EnrollPersistentDeviceParams): {
        record: PersistentDeviceTrustRecord;
        key: DeviceKeyMetadata;
    };
    /**
     * Issues an ephemeral challenge for passwordless device recognition.
     */
    createRecognitionChallenge(deviceId: string, scope: ScopedDeviceIdentity, ttlMs?: number): DeviceChallenge;
    /**
     * Generates a device proof using the device's key store (device-side helper).
     */
    respondToChallenge(challengeId: string, deviceId: string): DeviceProof;
    /**
     * Verifies proof and performs authoritative passwordless device recognition.
     * STRICT INVARIANT: Successful recognition yields SESSION_ELIGIBLE ONLY,
     * NOT Brain authorization or tool execution.
     */
    verifyProofAndRecognize(proof: DeviceProof): DeviceRecognitionResult;
    /**
     * Rehydrates a device record from persistent storage and validates against current scope.
     */
    rehydrateDevice(deviceId: string, currentScope: ScopedDeviceIdentity): DeviceRehydrationResult;
    /**
     * Revokes a persistent device and invalidates its active key material.
     * Strict fail-closed invariant.
     */
    revokeDevice(deviceId: string, reason: string): DeviceRevocationResult;
    /**
     * Rotates a device's cryptographic key material and advances key version monotonically.
     */
    rotateDeviceKey(deviceId: string): DeviceKeyRotationResult;
    getDevice(deviceId: string): PersistentDeviceTrustRecord | undefined;
    getDeviceByScope(deviceId: string, scopeString: string): PersistentDeviceTrustRecord | undefined;
    getDevicesByUser(userId: string): readonly PersistentDeviceTrustRecord[];
    getDevicesByScope(scopeString: string): readonly PersistentDeviceTrustRecord[];
    clear(): void;
}
