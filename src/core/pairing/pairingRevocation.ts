// src/core/pairing/pairingRevocation.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Authoritative device trust revocation and re-pairing semantics.

import type { PairingRecord, TrustRecord } from './pairingTypes.js';
import { deepFreeze, computePairingDigest } from './pairingFingerprint.js';
import { revokePairingRecord } from './pairingRecord.js';
import { assertValidPairingTransition } from './pairingTransitions.js';

export interface RevocationResult {
  readonly revokedPairing: PairingRecord;
  readonly revokedTrust?: TrustRecord;
}

/**
 * Authoritatively revokes trust and pairing for a device.
 * Preserves audit history and prevents automatic trust restoration.
 */
export function revokeDeviceTrust(
  pairingRecord: PairingRecord,
  trustRecord: TrustRecord | undefined,
  revokedBy: string,
  reason: string,
  timestamp?: number
): RevocationResult {
  if (typeof revokedBy !== 'string' || revokedBy.trim().length === 0) {
    throw new Error('[PAIRING_INVALID_REQUEST] revokedBy must be a non-empty string');
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error('[PAIRING_INVALID_REQUEST] Revocation reason must be non-empty');
  }

  const now = timestamp ?? Date.now();
  const revokedPairing = revokePairingRecord(pairingRecord, revokedBy, reason, now);

  let revokedTrust: TrustRecord | undefined;
  if (trustRecord) {
    const updatedTrustFingerprint = computePairingDigest({
      trustId: trustRecord.trustId,
      deviceId: trustRecord.deviceId,
      pairingId: trustRecord.pairingId,
      scopeString: trustRecord.scopeString,
      trustLevel: 'REVOKED',
      capabilityFingerprint: trustRecord.capabilityFingerprint,
      revokedAt: now,
      revocationReason: reason,
    });

    revokedTrust = deepFreeze({
      ...trustRecord,
      trustLevel: 'REVOKED',
      active: false,
      revokedAt: now,
      revocationReason: reason,
      trustFingerprint: updatedTrustFingerprint,
    });
  }

  return { revokedPairing, revokedTrust };
}

/**
 * Checks if a device pairing record can initiate a re-pairing lifecycle.
 */
export function canRePair(record: PairingRecord): boolean {
  return (
    record.pairingState === 'REVOKED' ||
    record.pairingState === 'EXPIRED' ||
    record.pairingState === 'REJECTED' ||
    record.pairingState === 'FAILED'
  );
}

/**
 * Initiates a re-pairing lifecycle for a previously revoked/terminal device record.
 * Direct transition from REVOKED to TRUSTED is strictly prohibited.
 */
export function initiateRePair(
  record: PairingRecord,
  newSequence: number,
  timestamp?: number
): PairingRecord {
  if (!canRePair(record)) {
    throw new Error(
      `[PAIRING_INVALID_REQUEST] Device in state '${record.pairingState}' cannot initiate re-pairing`
    );
  }

  // Authoritatively assert transition from current state to PAIRING_REQUESTED
  assertValidPairingTransition(record.pairingState, 'PAIRING_REQUESTED');

  const now = timestamp ?? Date.now();
  const resetRecord: PairingRecord = {
    ...record,
    pairingState: 'PAIRING_REQUESTED',
    trustLevel: 'NONE',
    confirmed: false,
    confirmedBy: undefined,
    confirmedAt: undefined,
    revoked: false,
    revokedBy: undefined,
    revokedReason: undefined,
    revokedAt: undefined,
    updatedAt: now,
  };

  return deepFreeze(resetRecord);
}
