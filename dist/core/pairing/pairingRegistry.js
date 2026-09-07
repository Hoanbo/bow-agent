// src/core/pairing/pairingRegistry.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// In-memory, 9-tuple scope-isolated registry for pairing and trust records.
// Zero filesystem/database dependencies; pure logical state foundation.
export class PairingRegistry {
    // Key: pairingId -> PairingRecord
    pairingsById = new Map();
    // Key: `${scopeString}::${deviceId}` -> PairingRecord
    pairingsByScopeAndDevice = new Map();
    // Key: `${scopeString}::${deviceId}` -> TrustRecord
    trustByScopeAndDevice = new Map();
    // Key: `${scopeString}::${deviceId}` -> Revocation metadata
    revocationsByScopeAndDevice = new Map();
    makeScopeKey(scopeString, deviceId) {
        return `${scopeString}::${deviceId}`;
    }
    /**
     * Registers a new pairing record.
     */
    registerPairing(record) {
        const key = this.makeScopeKey(record.scopeString, record.deviceId);
        this.pairingsById.set(record.pairingId, record);
        this.pairingsByScopeAndDevice.set(key, record);
    }
    /**
     * Retrieves a pairing record by its unique pairingId.
     */
    getPairing(pairingId) {
        return this.pairingsById.get(pairingId);
    }
    /**
     * Retrieves a pairing record by deviceId and 9-tuple scopeString.
     */
    getPairingRecord(deviceId, scopeString) {
        const key = this.makeScopeKey(scopeString, deviceId);
        return this.pairingsByScopeAndDevice.get(key);
    }
    /**
     * Updates an existing pairing record.
     */
    updatePairing(record) {
        const key = this.makeScopeKey(record.scopeString, record.deviceId);
        this.pairingsById.set(record.pairingId, record);
        this.pairingsByScopeAndDevice.set(key, record);
    }
    /**
     * Stores an authoritative trust record.
     */
    saveTrustRecord(trust) {
        const key = this.makeScopeKey(trust.scopeString, trust.deviceId);
        this.trustByScopeAndDevice.set(key, trust);
    }
    /**
     * Retrieves a trust record by deviceId and scopeString.
     */
    getTrustRecord(deviceId, scopeString) {
        const key = this.makeScopeKey(scopeString, deviceId);
        return this.trustByScopeAndDevice.get(key);
    }
    /**
     * Records authoritative revocation in the registry.
     */
    recordRevocation(deviceId, scopeString, reason) {
        const key = this.makeScopeKey(scopeString, deviceId);
        this.revocationsByScopeAndDevice.set(key, {
            revokedAt: Date.now(),
            reason,
        });
    }
    /**
     * Checks whether a device is marked as revoked in this scope.
     */
    isDeviceRevoked(deviceId, scopeString) {
        const key = this.makeScopeKey(scopeString, deviceId);
        if (this.revocationsByScopeAndDevice.has(key)) {
            return true;
        }
        const pairing = this.pairingsByScopeAndDevice.get(key);
        if (pairing && (pairing.revoked || pairing.pairingState === 'REVOKED')) {
            return true;
        }
        const trust = this.trustByScopeAndDevice.get(key);
        if (trust && (trust.trustLevel === 'REVOKED' || !trust.active)) {
            return true;
        }
        return false;
    }
    /**
     * Lists all pairing records, optionally filtered by scope string prefix.
     */
    listPairings(scopeFilter) {
        const records = Array.from(this.pairingsById.values());
        if (!scopeFilter) {
            return Object.freeze(records);
        }
        return Object.freeze(records.filter((r) => r.scopeString.startsWith(scopeFilter)));
    }
    /**
     * Lists all trust records, optionally filtered by scope string prefix.
     */
    listTrustRecords(scopeFilter) {
        const records = Array.from(this.trustByScopeAndDevice.values());
        if (!scopeFilter) {
            return Object.freeze(records);
        }
        return Object.freeze(records.filter((r) => r.scopeString.startsWith(scopeFilter)));
    }
    /**
     * Clears all entries in the registry.
     */
    clear() {
        this.pairingsById.clear();
        this.pairingsByScopeAndDevice.clear();
        this.trustByScopeAndDevice.clear();
        this.revocationsByScopeAndDevice.clear();
    }
}
