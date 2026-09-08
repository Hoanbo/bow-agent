// src/core/deviceIdentity/persistentDeviceRuntime.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative Persistent Device Identity & Passwordless Recognition Runtime.
// Coordinates persistent identity generation, device key material, cryptographic
// challenge-response proofs, rehydration, revocation, rotation, and scrubbed audit trails.
//
// STRICT INVARIANTS:
// - DEVICE_IDENTITY != DEVICE_AUTHENTICATION != AUTHORIZATION != EXECUTION
// - DEVICE_RECOGNITION != EXECUTION_AUTHORITY
// - DEVICE_TRUST != BRAIN_AUTHORITY
// - PERSISTENCE != BRAIN_MEMORY
// - ZERO raw private key material stored, persisted, or logged.
// - RECOGNITION establishes session eligibility ONLY, never execution authority.

import type { DeviceType, DeviceTrustLevel, SafeDeviceCapability, ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { createDeviceScope } from '../pairing/pairingScope.js';
import type {
  PersistentDeviceTrustRecord,
  DeviceKeyMetadata,
  DeviceChallenge,
  DeviceProof,
  DeviceRecognitionResult,
  DeviceRehydrationResult,
  DeviceRevocationResult,
  DeviceKeyRotationResult,
  DeviceRecognitionPolicy,
} from './persistentDeviceTypes.js';
import { PersistentDeviceRegistry } from './persistentDeviceRegistry.js';
import { PersistentDeviceStore, InMemoryPersistentDeviceStore } from './persistentDeviceStorage.js';
import { DeviceKeyStore, InMemoryDeviceKeyStore, rotateDeviceKey } from './persistentDeviceKey.js';
import { PersistentDeviceAuditLedger } from './persistentDeviceAudit.js';
import { createPersistentDeviceError } from './persistentDeviceError.js';
import {
  createSuccessRecognitionResult,
  createFailureRecognitionResult,
  createSuccessRehydrationResult,
  createFailureRehydrationResult,
  createSuccessRevocationResult,
  createSuccessRotationResult,
} from './persistentDeviceResult.js';
import { generatePersistentDeviceId, type PersistentDeviceEnrollmentMetadata } from './persistentDeviceIdentity.js';
import { createDeviceChallenge, generateDeviceProof, verifyDeviceProof } from './persistentDeviceProof.js';
import { createPersistentDeviceRecord, transitionDeviceRecordState, DEFAULT_RECOGNITION_POLICY } from './persistentDeviceRecord.js';
import { rehydrateDeviceRecord } from './persistentDeviceRehydration.js';
import { revokePersistentDevice } from './persistentDeviceRevocation.js';
import { rotatePersistentDeviceKey } from './persistentDeviceRotation.js';
import { validatePersistentDeviceTrust } from './persistentDeviceTrust.js';

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

export class PersistentDeviceIdentityRuntime {
  private readonly registry: PersistentDeviceRegistry;
  private readonly store: PersistentDeviceStore;
  private readonly keyStore: DeviceKeyStore;
  private readonly auditLedger: PersistentDeviceAuditLedger;

  constructor(options?: {
    registry?: PersistentDeviceRegistry;
    store?: PersistentDeviceStore;
    keyStore?: DeviceKeyStore;
    auditLedger?: PersistentDeviceAuditLedger;
  }) {
    this.registry = options?.registry ?? new PersistentDeviceRegistry();
    this.store = options?.store ?? new InMemoryPersistentDeviceStore();
    this.keyStore = options?.keyStore ?? new InMemoryDeviceKeyStore();
    this.auditLedger = options?.auditLedger ?? new PersistentDeviceAuditLedger();
  }

  public getRegistry(): PersistentDeviceRegistry {
    return this.registry;
  }

  public getStore(): PersistentDeviceStore {
    return this.store;
  }

  public getKeyStore(): DeviceKeyStore {
    return this.keyStore;
  }

  public getAuditLedger(): PersistentDeviceAuditLedger {
    return this.auditLedger;
  }

  /**
   * Enrolls a device: creates persistent device identity, key material (v1),
   * trust record, stores in registry & storage, and records scrubbed audit.
   */
  public enrollDevice(params: EnrollPersistentDeviceParams): {
    record: PersistentDeviceTrustRecord;
    key: DeviceKeyMetadata;
  } {
    const deviceId = generatePersistentDeviceId(params.metadata);
    const scopeString = createDeviceScope(params.scope);

    // Generate or retrieve key material in DeviceKeyStore
    let keyMeta = this.keyStore.getKeyForDevice(deviceId);
    if (!keyMeta) {
      keyMeta = this.keyStore.generateKey(deviceId, 1, params.algorithm ?? 'ED25519_REF');
    }
    this.registry.registerKey(keyMeta);

    const record = createPersistentDeviceRecord({
      deviceId,
      userId: params.userId ?? params.scope.userId,
      brainId: params.brainId ?? params.scope.brainId,
      surfaceId: params.surfaceId ?? params.scope.surfaceId,
      pairingId: params.pairingId ?? `pair_${deviceId}`,
      trustId: params.trustId ?? `trust_${deviceId}`,
      deviceType: params.metadata.deviceType,
      scope: params.scope,
      publicKeyId: keyMeta.keyId,
      keyVersion: keyMeta.keyVersion,
      trustLevel: params.trustLevel,
      capabilityEnvelope: params.capabilities,
      recognitionPolicy: params.recognitionPolicy ? { ...DEFAULT_RECOGNITION_POLICY, ...params.recognitionPolicy } : undefined,
    });

    // Save to storage & registry
    this.store.save(record);
    this.registry.registerDevice(record);

    // Audit logs
    this.auditLedger.record({
      eventType: 'DEVICE_IDENTITY_CREATED',
      deviceId,
      scopeString,
      keyVersion: keyMeta.keyVersion,
      state: record.lifecycleState,
      details: { deviceType: params.metadata.deviceType, keyId: keyMeta.keyId },
    });

    this.auditLedger.record({
      eventType: 'DEVICE_PERSISTED',
      deviceId,
      scopeString,
      keyVersion: keyMeta.keyVersion,
      state: record.lifecycleState,
      details: { fingerprint: record.deterministicFingerprint },
    });

    return { record, key: keyMeta };
  }

  /**
   * Issues an ephemeral challenge for passwordless device recognition.
   */
  public createRecognitionChallenge(
    deviceId: string,
    scope: ScopedDeviceIdentity,
    ttlMs?: number,
  ): DeviceChallenge {
    const scopeString = createDeviceScope(scope);

    let record: PersistentDeviceTrustRecord | undefined;
    const stored = this.store.get(deviceId);
    if (stored instanceof Promise) {
      throw createPersistentDeviceError('DEVICE_NOT_FOUND', 'Device lookup requires synchronous resolution in core');
    }
    if (stored) {
      record = stored;
      this.registry.updateDevice(record);
    } else {
      record = this.registry.getDevice(deviceId);
    }

    if (!record) {
      this.auditLedger.record({
        eventType: 'DEVICE_LOOKUP',
        deviceId,
        scopeString,
        details: { outcome: 'NOT_FOUND' },
      });
      throw createPersistentDeviceError('DEVICE_NOT_FOUND', `Device ${deviceId} not found in registry or store`, {
        deviceId,
        scopeString,
      });
    }

    if (record.revoked || record.trustLevel === 'REVOKED') {
      throw createPersistentDeviceError('DEVICE_REVOKED', `Device ${deviceId} has been revoked`, {
        deviceId,
        scopeString,
      });
    }

    const challenge = createDeviceChallenge({
      deviceId,
      scope,
      keyVersion: record.keyVersion,
      ttlMs,
    });
    this.registry.storeChallenge(challenge);

    // Update state to RECOGNITION_CHALLENGE
    const updatedRecord = transitionDeviceRecordState(record, 'RECOGNITION_CHALLENGE');
    this.registry.updateDevice(updatedRecord);
    this.store.save(updatedRecord);

    this.auditLedger.record({
      eventType: 'RECOGNITION_CHALLENGE_CREATED',
      deviceId,
      scopeString,
      keyVersion: challenge.keyVersion,
      state: 'RECOGNITION_CHALLENGE',
      details: { challengeId: challenge.challengeId, expiresAt: challenge.expiresAt },
    });

    return challenge;
  }

  /**
   * Generates a device proof using the device's key store (device-side helper).
   */
  public respondToChallenge(challengeId: string, deviceId: string): DeviceProof {
    const challenge = this.registry.getChallenge(challengeId);
    if (!challenge) {
      throw createPersistentDeviceError('DEVICE_CHALLENGE_MISMATCH', `Challenge ${challengeId} not found`, {
        deviceId,
      });
    }

    if (challenge.deviceId !== deviceId) {
      throw createPersistentDeviceError('DEVICE_IDENTITY_MISMATCH', `Challenge deviceId mismatch`, {
        deviceId,
      });
    }

    return generateDeviceProof(challenge, this.keyStore);
  }

  /**
   * Verifies proof and performs authoritative passwordless device recognition.
   * STRICT INVARIANT: Successful recognition yields SESSION_ELIGIBLE ONLY,
   * NOT Brain authorization or tool execution.
   */
  public verifyProofAndRecognize(proof: DeviceProof): DeviceRecognitionResult {
    const challenge = this.registry.consumeChallenge(proof.challengeId);
    if (!challenge) {
      this.auditLedger.record({
        eventType: 'DEVICE_RECOGNITION_FAILED',
        deviceId: proof.deviceId,
        scopeString: 'UNKNOWN',
        details: { reason: 'Challenge not found or already consumed', challengeId: proof.challengeId },
      });
      return createFailureRecognitionResult(
        'DEVICE_CHALLENGE_MISMATCH',
        `Challenge ${proof.challengeId} not found or expired`,
      );
    }

    const scopeString = challenge.scopeString;

    // Check anti-replay nonce
    if (this.registry.hasProofNonce(proof.deviceId, proof.nonce)) {
      this.auditLedger.record({
        eventType: 'DEVICE_PROOF_REPLAY',
        deviceId: proof.deviceId,
        scopeString,
        keyVersion: proof.keyVersion,
        details: { nonce: proof.nonce },
      });
      return createFailureRecognitionResult(
        'DEVICE_PROOF_REPLAY',
        `Proof nonce ${proof.nonce} has already been consumed (replay attempt blocked)`,
      );
    }

    // Verify cryptographic proof of possession
    const verification = verifyDeviceProof(challenge, proof, this.keyStore);
    if (!verification.valid) {
      this.auditLedger.record({
        eventType: 'DEVICE_PROOF_INVALID',
        deviceId: proof.deviceId,
        scopeString,
        keyVersion: proof.keyVersion,
        details: { failureCode: verification.failureCode, failureReason: verification.failureReason },
      });
      return createFailureRecognitionResult(
        verification.failureCode ?? 'DEVICE_PROOF_INVALID',
        verification.failureReason ?? 'Cryptographic proof verification failed',
      );
    }

    // Retrieve and validate device record
    let record = this.registry.getDevice(proof.deviceId);
    if (!record) {
      const stored = this.store.get(proof.deviceId);
      if (stored && !(stored instanceof Promise)) {
        record = stored;
      }
    }

    if (!record) {
      this.auditLedger.record({
        eventType: 'DEVICE_RECOGNITION_FAILED',
        deviceId: proof.deviceId,
        scopeString,
        details: { reason: 'Device record not found' },
      });
      return createFailureRecognitionResult('DEVICE_NOT_FOUND', `Device ${proof.deviceId} record not found`);
    }

    const trustValidation = validatePersistentDeviceTrust(record, challenge.scope);
    if (!trustValidation.trusted) {
      this.auditLedger.record({
        eventType: 'DEVICE_RECOGNITION_FAILED',
        deviceId: proof.deviceId,
        scopeString,
        keyVersion: record.keyVersion,
        details: { failureCode: trustValidation.failureCode, failureReason: trustValidation.failureReason },
      });
      return createFailureRecognitionResult(
        trustValidation.failureCode ?? 'DEVICE_NOT_TRUSTED',
        trustValidation.failureReason ?? 'Device trust validation failed',
        'FAILED',
        record,
      );
    }

    // Store proof and mark nonce as used
    this.registry.storeProof(proof);

    // Authoritative transition: PROOF_RECEIVED -> PROOF_VERIFIED -> RECOGNIZED -> SESSION_ELIGIBLE
    let updatedRecord = transitionDeviceRecordState(record, 'PROOF_RECEIVED');
    updatedRecord = transitionDeviceRecordState(updatedRecord, 'PROOF_VERIFIED');
    updatedRecord = transitionDeviceRecordState(updatedRecord, 'RECOGNIZED');
    updatedRecord = transitionDeviceRecordState(updatedRecord, 'SESSION_ELIGIBLE');

    this.registry.updateDevice(updatedRecord);
    this.store.save(updatedRecord);

    this.auditLedger.record({
      eventType: 'DEVICE_PROOF_RECEIVED',
      deviceId: proof.deviceId,
      scopeString,
      keyVersion: proof.keyVersion,
      state: 'PROOF_RECEIVED',
      details: { proofId: proof.proofId },
    });

    this.auditLedger.record({
      eventType: 'DEVICE_PROOF_VERIFIED',
      deviceId: proof.deviceId,
      scopeString,
      keyVersion: proof.keyVersion,
      state: 'PROOF_VERIFIED',
      details: { proofId: proof.proofId },
    });

    this.auditLedger.record({
      eventType: 'DEVICE_RECOGNIZED',
      deviceId: proof.deviceId,
      scopeString,
      keyVersion: proof.keyVersion,
      state: 'SESSION_ELIGIBLE',
      details: { sessionEligible: true, deviceId: proof.deviceId },
    });

    return createSuccessRecognitionResult(updatedRecord, 'SESSION_ELIGIBLE');
  }

  /**
   * Rehydrates a device record from persistent storage and validates against current scope.
   */
  public rehydrateDevice(deviceId: string, currentScope: ScopedDeviceIdentity): DeviceRehydrationResult {
    const scopeString = createDeviceScope(currentScope);
    const stored = this.store.get(deviceId);
    if (!stored || stored instanceof Promise) {
      return createFailureRehydrationResult(`Device ${deviceId} not found in persistent store`);
    }

    const rehydration = rehydrateDeviceRecord(stored, currentScope);
    if (!rehydration.rehydrated || !rehydration.record) {
      this.auditLedger.record({
        eventType: 'DEVICE_SCOPE_MISMATCH',
        deviceId,
        scopeString,
        details: { error: rehydration.error },
      });
      return rehydration;
    }

    this.registry.registerDevice(rehydration.record);

    this.auditLedger.record({
      eventType: 'DEVICE_REHYDRATED',
      deviceId,
      scopeString,
      keyVersion: rehydration.record.keyVersion,
      state: rehydration.record.lifecycleState,
      details: { fingerprint: rehydration.record.deterministicFingerprint },
    });

    return rehydration;
  }

  /**
   * Revokes a persistent device and invalidates its active key material.
   * Strict fail-closed invariant.
   */
  public revokeDevice(deviceId: string, reason: string): DeviceRevocationResult {
    let record = this.registry.getDevice(deviceId);
    if (!record) {
      const stored = this.store.get(deviceId);
      if (stored && !(stored instanceof Promise)) {
        record = stored;
      }
    }

    if (!record) {
      throw createPersistentDeviceError('DEVICE_NOT_FOUND', `Device ${deviceId} not found for revocation`, {
        deviceId,
      });
    }

    const previousState = record.lifecycleState;
    const revokedResult = revokePersistentDevice(
      this.store,
      this.keyStore,
      deviceId,
      record.scopeString,
      reason,
    );

    this.registry.updateDevice(revokedResult.revokedRecord);

    this.auditLedger.record({
      eventType: 'DEVICE_REVOKED',
      deviceId,
      scopeString: record.scopeString,
      keyVersion: record.keyVersion,
      state: 'REVOKED',
      details: { reason, previousState },
    });

    return revokedResult;
  }

  /**
   * Rotates a device's cryptographic key material and advances key version monotonically.
   */
  public rotateDeviceKey(deviceId: string): DeviceKeyRotationResult {
    let record = this.registry.getDevice(deviceId);
    if (!record) {
      const stored = this.store.get(deviceId);
      if (stored && !(stored instanceof Promise)) {
        record = stored;
      }
    }

    if (!record) {
      throw createPersistentDeviceError('DEVICE_NOT_FOUND', `Device ${deviceId} not found for key rotation`, {
        deviceId,
      });
    }

    const rotationResult = rotatePersistentDeviceKey(
      this.store,
      this.keyStore,
      deviceId,
      record.scopeString,
    );

    const newKeyMeta = this.keyStore.getKeyForDevice(deviceId, rotationResult.newKeyVersion);
    if (newKeyMeta) {
      this.registry.registerKey(newKeyMeta);
    }
    this.registry.updateDevice(rotationResult.updatedRecord);

    this.auditLedger.record({
      eventType: 'DEVICE_KEY_ROTATED',
      deviceId,
      scopeString: record.scopeString,
      keyVersion: rotationResult.newKeyVersion,
      state: rotationResult.updatedRecord.lifecycleState,
      details: {
        oldKeyVersion: rotationResult.oldKeyVersion,
        newKeyVersion: rotationResult.newKeyVersion,
        newKeyId: newKeyMeta?.keyId,
      },
    });

    return rotationResult;
  }

  public getDevice(deviceId: string): PersistentDeviceTrustRecord | undefined {
    return this.registry.getDevice(deviceId);
  }

  public getDeviceByScope(deviceId: string, scopeString: string): PersistentDeviceTrustRecord | undefined {
    return this.registry.getDeviceByScope(deviceId, scopeString);
  }

  public getDevicesByUser(userId: string): readonly PersistentDeviceTrustRecord[] {
    return this.registry.getDevicesByUser(userId);
  }

  public getDevicesByScope(scopeString: string): readonly PersistentDeviceTrustRecord[] {
    return this.registry.getDevicesByScope(scopeString);
  }

  public clear(): void {
    this.registry.clear();
    this.store.clear();
    this.keyStore.clear();
    this.auditLedger.clear();
  }
}
