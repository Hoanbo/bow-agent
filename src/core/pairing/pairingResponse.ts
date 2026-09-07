// src/core/pairing/pairingResponse.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Canonical PairingResponse factory.
// Invariant: PAIRING_ACCEPTED != AUTHORIZED != EXECUTED != TASK_SUCCESS.

import type {
  PairingResponse,
  PairingOutcome,
  PairingState,
  DeviceTrustLevel,
  ScopedDeviceIdentity,
} from './pairingTypes.js';
import { PAIRING_PROTOCOL_VERSION } from './pairingTypes.js';
import { deepFreeze, computePairingDigest } from './pairingFingerprint.js';
import { createDeviceScope } from './pairingScope.js';

export interface CreatePairingResponseParams {
  readonly outcome: PairingOutcome;
  readonly pairingId: string;
  readonly deviceId: string;
  readonly pairingState: PairingState;
  readonly trustLevel: DeviceTrustLevel;
  readonly scope: ScopedDeviceIdentity;
  readonly sequence: number;
  readonly protocolVersion?: string;
  readonly message?: string;
  readonly timestamp?: number;
}

/**
 * Creates an authoritative immutable PairingResponse.
 */
export function createPairingResponse(params: CreatePairingResponseParams): PairingResponse {
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

  const response: PairingResponse = {
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
