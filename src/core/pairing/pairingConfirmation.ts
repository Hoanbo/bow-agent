// src/core/pairing/pairingConfirmation.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Explicit user confirmation boundary.
// Invariant: CONNECTION != TRUST. A device is never automatically trusted without explicit confirmation.

import type { PairingRecord } from './pairingTypes.js';
import { updatePairingRecordState } from './pairingRecord.js';

export interface ConfirmationResult {
  readonly confirmedRecord: PairingRecord;
  readonly previousState: string;
  readonly newState: string;
}

/**
 * Checks whether a pairing record is in an explicit confirmable state.
 */
export function canConfirmPairing(record: PairingRecord): boolean {
  return (
    record.pairingState === 'PAIRING_PENDING' &&
    !record.revoked &&
    record.trustLevel !== 'REVOKED'
  );
}

/**
 * Authoritatively confirms a pending pairing record.
 * Fails closed if the record is not in PAIRING_PENDING state or has been revoked.
 */
export function confirmPairing(
  record: PairingRecord,
  confirmedBy: string,
  timestamp?: number
): PairingRecord {
  if (typeof confirmedBy !== 'string' || confirmedBy.trim().length === 0) {
    throw new Error('[PAIRING_INVALID_REQUEST] confirmedBy must be a non-empty string');
  }

  if (record.revoked || record.trustLevel === 'REVOKED' || record.pairingState === 'REVOKED') {
    throw new Error('[PAIRING_REVOKED] Cannot confirm a revoked pairing record');
  }

  if (record.pairingState !== 'PAIRING_PENDING') {
    throw new Error(
      `[PAIRING_NOT_CONFIRMABLE] Record in state '${record.pairingState}' cannot be confirmed (expected 'PAIRING_PENDING')`
    );
  }

  const now = timestamp ?? Date.now();

  // Transition: PAIRING_PENDING -> PAIRING_CONFIRMED
  const confirmed = updatePairingRecordState(
    record,
    'PAIRING_CONFIRMED',
    'NONE',
    {
      confirmed: true,
      confirmedBy,
      confirmedAt: now,
    },
    now
  );

  // Transition: PAIRING_CONFIRMED -> PAIRED
  const paired = updatePairingRecordState(
    confirmed,
    'PAIRED',
    'PAIRED',
    undefined,
    now
  );

  // Transition: PAIRED -> TRUSTED
  const trusted = updatePairingRecordState(
    paired,
    'TRUSTED',
    'TRUSTED',
    undefined,
    now
  );

  return trusted;
}
