// src/core/pairing/pairingResponse.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Canonical PairingResponse factory.
// Invariant: PAIRING_ACCEPTED != AUTHORIZED != EXECUTED != TASK_SUCCESS.
import { PAIRING_PROTOCOL_VERSION } from './pairingTypes.js';
import { deepFreeze, computePairingDigest } from './pairingFingerprint.js';
import { createDeviceScope } from './pairingScope.js';
/**
 * Creates an authoritative immutable PairingResponse.
 */
export function createPairingResponse(params) {
    const protocolVersion = params.protocolVersion ?? PAIRING_PROTOCOL_VERSION;
    const now = params.timestamp ?? Date.now();
    const scopeString = createDeviceScope(params.scope);
    const responseFingerprint = computePairingDigest({
        outcome: params.outcome,
        pairingId: params.pairingId,
        deviceId: params.deviceId,
        pairingState: params.pairingState,
        trustLevel: params.trustLevel,
        protocolVersion,
        scopeString,
        sequence: params.sequence,
        message: params.message ?? '',
    });
    const response = {
        outcome: params.outcome,
        pairingId: params.pairingId,
        deviceId: params.deviceId,
        pairingState: params.pairingState,
        trustLevel: params.trustLevel,
        protocolVersion,
        scope: Object.freeze({ ...params.scope }),
        responseFingerprint,
        message: params.message,
        sequence: params.sequence,
        timestamp: now,
    };
    return deepFreeze(response);
}
