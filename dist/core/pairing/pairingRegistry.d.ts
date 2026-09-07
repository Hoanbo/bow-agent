import type { PairingRecord, TrustRecord } from './pairingTypes.js';
export declare class PairingRegistry {
    private readonly pairingsById;
    private readonly pairingsByScopeAndDevice;
    private readonly trustByScopeAndDevice;
    private readonly revocationsByScopeAndDevice;
    private makeScopeKey;
    /**
     * Registers a new pairing record.
     */
    registerPairing(record: PairingRecord): void;
    /**
     * Retrieves a pairing record by its unique pairingId.
     */
    getPairing(pairingId: string): PairingRecord | undefined;
    /**
     * Retrieves a pairing record by deviceId and 9-tuple scopeString.
     */
    getPairingRecord(deviceId: string, scopeString: string): PairingRecord | undefined;
    /**
     * Updates an existing pairing record.
     */
    updatePairing(record: PairingRecord): void;
    /**
     * Stores an authoritative trust record.
     */
    saveTrustRecord(trust: TrustRecord): void;
    /**
     * Retrieves a trust record by deviceId and scopeString.
     */
    getTrustRecord(deviceId: string, scopeString: string): TrustRecord | undefined;
    /**
     * Records authoritative revocation in the registry.
     */
    recordRevocation(deviceId: string, scopeString: string, reason: string): void;
    /**
     * Checks whether a device is marked as revoked in this scope.
     */
    isDeviceRevoked(deviceId: string, scopeString: string): boolean;
    /**
     * Lists all pairing records, optionally filtered by scope string prefix.
     */
    listPairings(scopeFilter?: string): readonly PairingRecord[];
    /**
     * Lists all trust records, optionally filtered by scope string prefix.
     */
    listTrustRecords(scopeFilter?: string): readonly TrustRecord[];
    /**
     * Clears all entries in the registry.
     */
    clear(): void;
}
