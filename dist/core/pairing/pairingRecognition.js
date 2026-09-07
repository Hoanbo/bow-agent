// src/core/pairing/pairingRecognition.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Logical device recognition for previously paired and trusted devices.
// Enables seamless reconnection without traditional username/password login.
// Invariant: RECOGNITION != AUTHORIZATION != TOOL_EXECUTION.
import { PAIRING_PROTOCOL_VERSION } from './pairingTypes.js';
import { createDeviceScope } from './pairingScope.js';
/**
 * Logically recognizes a previously paired device presenting its identity.
 * Strictly verifies scope, fingerprints, and active trust.
 * NEVER executes tools or mutates cognitive brain state.
 */
export function recognizeDevice(source, presentation) {
    const protocol = presentation.protocolVersion ?? PAIRING_PROTOCOL_VERSION;
    if (protocol !== PAIRING_PROTOCOL_VERSION) {
        return {
            recognized: false,
            trusted: false,
            rejectionReason: `[PAIRING_PROTOCOL_MISMATCH] Incompatible protocol version: ${protocol}`,
        };
    }
    const scopeString = createDeviceScope(presentation.scope);
    const pairing = source.getPairingRecord(presentation.deviceId, scopeString);
    if (!pairing) {
        return {
            recognized: false,
            trusted: false,
            rejectionReason: `[PAIRING_NOT_FOUND] No pairing record found for device ${presentation.deviceId}`,
        };
    }
    // Verify device fingerprint
    if (pairing.deviceFingerprint !== presentation.deviceFingerprint) {
        return {
            recognized: false,
            trusted: false,
            rejectionReason: `[PAIRING_DEVICE_MISMATCH] Device fingerprint mismatch for ${presentation.deviceId}`,
        };
    }
    // Verify capability fingerprint
    if (pairing.capabilityFingerprint !== presentation.capabilityFingerprint) {
        return {
            recognized: false,
            trusted: false,
            rejectionReason: `[PAIRING_CAPABILITY_REJECTED] Capability fingerprint mismatch for ${presentation.deviceId}`,
        };
    }
    // Check revocation
    if (pairing.revoked || pairing.pairingState === 'REVOKED' || pairing.trustLevel === 'REVOKED') {
        return {
            recognized: true,
            trusted: false,
            pairingRecord: pairing,
            rejectionReason: `[PAIRING_REVOKED] Device ${presentation.deviceId} has been revoked`,
        };
    }
    // Lookup trust record
    const trust = source.getTrustRecord(presentation.deviceId, scopeString);
    const isTrusted = pairing.pairingState === 'TRUSTED' &&
        pairing.trustLevel === 'TRUSTED' &&
        trust !== undefined &&
        trust.active &&
        trust.trustLevel === 'TRUSTED';
    return {
        recognized: true,
        trusted: isTrusted,
        pairingRecord: pairing,
        trustRecord: trust,
    };
}
