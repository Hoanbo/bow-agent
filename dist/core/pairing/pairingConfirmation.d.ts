import type { PairingRecord } from './pairingTypes.js';
export interface ConfirmationResult {
    readonly confirmedRecord: PairingRecord;
    readonly previousState: string;
    readonly newState: string;
}
/**
 * Checks whether a pairing record is in an explicit confirmable state.
 */
export declare function canConfirmPairing(record: PairingRecord): boolean;
/**
 * Authoritatively confirms a pending pairing record.
 * Fails closed if the record is not in PAIRING_PENDING state or has been revoked.
 */
export declare function confirmPairing(record: PairingRecord, confirmedBy: string, timestamp?: number): PairingRecord;
