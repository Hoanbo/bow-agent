// src/core/admission/admissionProof.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Bridge to persistent device proof validation (MS-1.3.24).
// Reuses authoritative cryptographic challenge-response verification without duplication.
import { verifyDeviceProof } from '../deviceIdentity/persistentDeviceProof.js';
/**
 * Validates an incoming admission proof against the issued challenge and registered device key store.
 */
export function validateAdmissionProof(challenge, proof, keyStore, now = Date.now()) {
    if (!proof) {
        return {
            valid: false,
            challengeId: challenge.challengeId,
            deviceId: challenge.deviceId,
            keyVersion: challenge.keyVersion,
            failureCode: 'DEVICE_PROOF_INVALID',
            failureReason: 'Cryptographic proof of possession was not provided.',
            verifiedAt: now,
        };
    }
    // Delegate directly to authoritative verification engine from MS-1.3.24
    return verifyDeviceProof(challenge, proof, keyStore, now);
}
export const verifyAdmissionProof = validateAdmissionProof;
/**
 * Asserts that a proof is strictly valid, throwing on failure.
 */
export function assertValidAdmissionProof(challenge, proof, keyStore, now = Date.now()) {
    const result = validateAdmissionProof(challenge, proof, keyStore, now);
    if (!result.valid) {
        throw new Error(`[${result.failureCode || 'ADMISSION_PROOF_INVALID'}] ${result.failureReason}`);
    }
}
