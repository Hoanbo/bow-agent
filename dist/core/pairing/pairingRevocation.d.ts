import type { PairingRecord, TrustRecord } from './pairingTypes.js';
export interface RevocationResult {
    readonly revokedPairing: PairingRecord;
    readonly revokedTrust?: TrustRecord;
}
/**
 * Authoritatively revokes trust and pairing for a device.
 * Preserves audit history and prevents automatic trust restoration.
 */
export declare function revokeDeviceTrust(pairingRecord: PairingRecord, trustRecord: TrustRecord | undefined, revokedBy: string, reason: string, timestamp?: number): RevocationResult;
/**
 * Checks if a device pairing record can initiate a re-pairing lifecycle.
 */
export declare function canRePair(record: PairingRecord): boolean;
/**
 * Initiates a re-pairing lifecycle for a previously revoked/terminal device record.
 * Direct transition from REVOKED to TRUSTED is strictly prohibited.
 */
export declare function initiateRePair(record: PairingRecord, newSequence: number, timestamp?: number): PairingRecord;
