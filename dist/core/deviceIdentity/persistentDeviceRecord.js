// src/core/deviceIdentity/persistentDeviceRecord.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Immutable PersistentDeviceTrustRecord models, factories, and state mutators.
import { PERSISTENT_DEVICE_PROTOCOL_VERSION } from './persistentDeviceTypes.js';
import { createDeviceScope } from '../pairing/pairingScope.js';
import { computeDeviceDigest, computeDeviceCapabilityFingerprint, deepFreezeDevice } from './persistentDeviceFingerprint.js';
import { assertValidPersistentDeviceStateTransition } from './persistentDeviceTransitions.js';
export const DEFAULT_RECOGNITION_POLICY = Object.freeze({
    maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    requireProofOfPossession: true,
    maxClockSkewMs: 5_000, // 5 seconds
});
/**
 * Creates an authoritative immutable PersistentDeviceTrustRecord.
 */
export function createPersistentDeviceTrustRecord(params) {
    const now = params.timestamp ?? Date.now();
    const scopeString = createDeviceScope(params.scope);
    const keyVersion = params.keyVersion ?? 1;
    const trustLevel = params.trustLevel ?? 'TRUSTED';
    const lifecycleState = params.lifecycleState ?? 'TRUSTED';
    const policy = params.recognitionPolicy ?? DEFAULT_RECOGNITION_POLICY;
    const capFp = computeDeviceCapabilityFingerprint(params.capabilityEnvelope);
    const deterministicFingerprint = computeDeviceDigest({
        deviceId: params.deviceId,
        userId: params.userId,
        brainId: params.brainId,
        surfaceId: params.surfaceId,
        pairingId: params.pairingId,
        trustId: params.trustId,
        publicKeyId: params.publicKeyId,
        keyVersion,
        scopeString,
        capFp,
        protocolVersion: PERSISTENT_DEVICE_PROTOCOL_VERSION,
        identityVersion: '1.0',
    });
    const record = {
        deviceId: params.deviceId,
        userId: params.userId,
        brainId: params.brainId,
        surfaceId: params.surfaceId,
        pairingId: params.pairingId,
        trustId: params.trustId,
        deviceType: params.deviceType,
        scope: Object.freeze({ ...params.scope }),
        scopeString,
        publicKeyId: params.publicKeyId,
        keyVersion,
        trustLevel,
        lifecycleState,
        capabilityEnvelope: Object.freeze([...params.capabilityEnvelope]),
        protocolVersion: PERSISTENT_DEVICE_PROTOCOL_VERSION,
        identityVersion: '1.0',
        recognitionPolicy: Object.freeze({ ...policy }),
        revoked: lifecycleState === 'REVOKED' || trustLevel === 'REVOKED',
        rotationRequired: lifecycleState === 'ROTATION_REQUIRED',
        deterministicFingerprint,
        enrolledAt: now,
        updatedAt: now,
        expiresAt: params.expiresAt,
    };
    return deepFreezeDevice(record);
}
/**
 * Updates the lifecycle state of a PersistentDeviceTrustRecord, asserting valid transition.
 */
export function updatePersistentDeviceTrustRecord(record, nextState, updates, timestamp) {
    assertValidPersistentDeviceStateTransition(record.lifecycleState, nextState);
    const now = timestamp ?? Date.now();
    const updated = {
        ...record,
        ...updates,
        lifecycleState: nextState,
        revoked: nextState === 'REVOKED' || updates?.revoked || record.revoked,
        rotationRequired: nextState === 'ROTATION_REQUIRED' || updates?.rotationRequired || record.rotationRequired,
        updatedAt: now,
    };
    return deepFreezeDevice(updated);
}
/**
 * Authoritatively revokes a persistent device trust record.
 */
export function revokePersistentDeviceTrustRecord(record, reason, timestamp) {
    const now = timestamp ?? Date.now();
    assertValidPersistentDeviceStateTransition(record.lifecycleState, 'REVOKED');
    const revoked = {
        ...record,
        lifecycleState: 'REVOKED',
        trustLevel: 'REVOKED',
        revoked: true,
        revocationReason: reason,
        revokedAt: now,
        updatedAt: now,
    };
    return deepFreezeDevice(revoked);
}
/**
 * Marks a persistent device trust record as requiring key rotation.
 */
export function markPersistentDeviceRotationRequired(record, timestamp) {
    const now = timestamp ?? Date.now();
    assertValidPersistentDeviceStateTransition(record.lifecycleState, 'ROTATION_REQUIRED');
    const marked = {
        ...record,
        lifecycleState: 'ROTATION_REQUIRED',
        rotationRequired: true,
        updatedAt: now,
    };
    return deepFreezeDevice(marked);
}
export const createPersistentDeviceRecord = createPersistentDeviceTrustRecord;
export const transitionDeviceRecordState = updatePersistentDeviceTrustRecord;
