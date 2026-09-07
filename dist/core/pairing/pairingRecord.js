// src/core/pairing/pairingRecord.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Immutable PairingRecord and TrustRecord models and factories.
import { PAIRING_PROTOCOL_VERSION } from './pairingTypes.js';
import { deepFreeze, computePairingDigest, computeCapabilityFingerprint } from './pairingFingerprint.js';
import { generatePairingId, generateTrustId } from './pairingIdentity.js';
import { createDeviceScope, scrubSecrets } from './pairingScope.js';
import { assertValidPairingTransition, assertValidTrustTransition } from './pairingTransitions.js';
/**
 * Creates an authoritative immutable PairingRecord.
 */
export function createPairingRecord(params) {
    const scopeString = createDeviceScope(params.scope);
    const sequence = params.sequence ?? 1;
    const pairingId = generatePairingId(params.deviceId, scopeString, sequence);
    const now = params.timestamp ?? Date.now();
    const state = params.pairingState ?? 'PAIRING_REQUESTED';
    const trust = params.trustLevel ?? 'NONE';
    const capabilityFingerprint = computeCapabilityFingerprint(params.capabilities);
    const pairingFingerprint = computePairingDigest({
        pairingId,
        deviceId: params.deviceId,
        deviceType: params.deviceType,
        surfaceId: params.surfaceId,
        scopeString,
        capabilityFingerprint,
        deviceFingerprint: params.deviceFingerprint,
    });
    const scrubbedMetadata = params.metadata ? scrubSecrets(params.metadata) : undefined;
    const record = {
        pairingId,
        deviceId: params.deviceId,
        deviceType: params.deviceType,
        surfaceId: params.surfaceId,
        scope: Object.freeze({ ...params.scope }),
        scopeString,
        pairingState: state,
        trustLevel: trust,
        protocolVersion: PAIRING_PROTOCOL_VERSION,
        capabilities: Object.freeze([...params.capabilities]),
        capabilityFingerprint,
        deviceFingerprint: params.deviceFingerprint,
        pairingFingerprint,
        confirmed: state === 'PAIRING_CONFIRMED' || state === 'PAIRED' || state === 'TRUSTED',
        revoked: state === 'REVOKED' || trust === 'REVOKED',
        createdAt: now,
        updatedAt: now,
        metadata: scrubbedMetadata ? Object.freeze(scrubbedMetadata) : undefined,
    };
    return deepFreeze(record);
}
/**
 * Creates an authoritative immutable TrustRecord.
 */
export function createTrustRecord(pairingRecord, trustLevel = 'TRUSTED', timestamp) {
    const now = timestamp ?? Date.now();
    const trustId = generateTrustId(pairingRecord.deviceId, pairingRecord.scopeString);
    const trustFingerprint = computePairingDigest({
        trustId,
        deviceId: pairingRecord.deviceId,
        pairingId: pairingRecord.pairingId,
        scopeString: pairingRecord.scopeString,
        trustLevel,
        capabilityFingerprint: pairingRecord.capabilityFingerprint,
    });
    const record = {
        trustId,
        deviceId: pairingRecord.deviceId,
        pairingId: pairingRecord.pairingId,
        scopeString: pairingRecord.scopeString,
        trustLevel,
        capabilityFingerprint: pairingRecord.capabilityFingerprint,
        trustFingerprint,
        active: trustLevel === 'TRUSTED' || trustLevel === 'LIMITED',
        grantedAt: now,
    };
    return deepFreeze(record);
}
/**
 * Updates the pairing state and trust level of an existing PairingRecord, enforcing valid transitions.
 */
export function updatePairingRecordState(record, nextState, nextTrust, updates, timestamp) {
    assertValidPairingTransition(record.pairingState, nextState);
    if (nextTrust) {
        assertValidTrustTransition(record.trustLevel, nextTrust);
    }
    const now = timestamp ?? Date.now();
    const updatedTrust = nextTrust ?? record.trustLevel;
    const updated = {
        ...record,
        ...updates,
        pairingState: nextState,
        trustLevel: updatedTrust,
        confirmed: nextState === 'PAIRING_CONFIRMED' ||
            nextState === 'PAIRED' ||
            nextState === 'TRUSTED' ||
            record.confirmed,
        revoked: nextState === 'REVOKED' || updatedTrust === 'REVOKED' || record.revoked,
        updatedAt: now,
    };
    return deepFreeze(updated);
}
/**
 * Revokes a pairing record authoritatively.
 */
export function revokePairingRecord(record, revokedBy, reason, timestamp) {
    const now = timestamp ?? Date.now();
    assertValidPairingTransition(record.pairingState, 'REVOKED');
    assertValidTrustTransition(record.trustLevel, 'REVOKED');
    const revoked = {
        ...record,
        pairingState: 'REVOKED',
        trustLevel: 'REVOKED',
        revoked: true,
        revokedBy,
        revokedReason: reason,
        revokedAt: now,
        updatedAt: now,
    };
    return deepFreeze(revoked);
}
