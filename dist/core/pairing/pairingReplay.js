// src/core/pairing/pairingReplay.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Authoritative replay protection for pairing flows.
// Defends against stale, mutated, cross-scope, and revoked-device replay attacks.
import { areScopesEqual } from './pairingScope.js';
export class PairingReplayDetector {
    seenNonces = new Set();
    highestSequence = new Map();
    seenFingerprints = new Map(); // nonce -> pairingFingerprint
    /**
     * Evaluates an incoming PairingRequest against existing pairing state and seen history.
     */
    evaluateRequest(req, existingRecord) {
        // 1. Cross-device check
        if (existingRecord && existingRecord.deviceId !== req.deviceId) {
            return 'CROSS_DEVICE_REPLAY';
        }
        // 2. Cross-scope check
        if (existingRecord && !areScopesEqual(existingRecord.scope, req.scope)) {
            return 'CROSS_SCOPE_REPLAY';
        }
        // 3. Revoked device check
        if (existingRecord && (existingRecord.revoked || existingRecord.pairingState === 'REVOKED')) {
            return 'REVOKED_REPLAY';
        }
        const deviceKey = `${req.scope.brainId}::${req.deviceId}`;
        const lastSeq = this.highestSequence.get(deviceKey) ?? 0;
        const nonceKey = `${deviceKey}::${req.nonce}`;
        // 4. Nonce already seen
        if (this.seenNonces.has(nonceKey)) {
            const priorFingerprint = this.seenFingerprints.get(nonceKey);
            if (priorFingerprint === req.pairingFingerprint) {
                return 'IDEMPOTENT_DUPLICATE';
            }
            return 'MUTATED_REPLAY';
        }
        // 5. Sequence validation: must be strictly monotonic for new nonces
        if (req.sequence <= lastSeq) {
            return 'STALE_REPLAY';
        }
        return 'VALID_NEW';
    }
    /**
     * Records a successfully validated request to track seen nonces and sequence numbers.
     */
    recordSeen(req) {
        const deviceKey = `${req.scope.brainId}::${req.deviceId}`;
        const nonceKey = `${deviceKey}::${req.nonce}`;
        this.seenNonces.add(nonceKey);
        this.seenFingerprints.set(nonceKey, req.pairingFingerprint);
        const currentHigh = this.highestSequence.get(deviceKey) ?? 0;
        if (req.sequence > currentHigh) {
            this.highestSequence.set(deviceKey, req.sequence);
        }
    }
    /**
     * Asserts that a request is valid and not an unauthorized replay.
     * Throws typed fail-closed errors for all unsafe conditions.
     */
    assertNotReplay(req, existingRecord) {
        const classification = this.evaluateRequest(req, existingRecord);
        switch (classification) {
            case 'VALID_NEW':
            case 'IDEMPOTENT_DUPLICATE':
                return;
            case 'STALE_REPLAY':
                throw new Error(`[PAIRING_REPLAY] Stale sequence number ${req.sequence} for device ${req.deviceId}`);
            case 'MUTATED_REPLAY':
                throw new Error(`[PAIRING_MUTATED_REPLAY] Mutated replay payload detected for nonce ${req.nonce}`);
            case 'CROSS_SCOPE_REPLAY':
                throw new Error(`[PAIRING_SCOPE_MISMATCH] Cross-scope replay attempt detected for device ${req.deviceId}`);
            case 'CROSS_DEVICE_REPLAY':
                throw new Error(`[PAIRING_DEVICE_MISMATCH] Cross-device replay attempt detected: ${req.deviceId}`);
            case 'REVOKED_REPLAY':
                throw new Error(`[PAIRING_REVOKED] Replay attempt from revoked device ${req.deviceId}; re-pairing required`);
            default:
                throw new Error(`[PAIRING_REPLAY] Unknown replay classification`);
        }
    }
    /**
     * Resets replay state (used for testing or scope teardown).
     */
    clear() {
        this.seenNonces.clear();
        this.highestSequence.clear();
        this.seenFingerprints.clear();
    }
}
