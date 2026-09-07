// src/core/pairing/pairingTrustRegistry.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Observational query interface for device trust and pairing state.
// Invariant: Queries are strictly observational. Zero tool execution, zero Brain mutation.
export class PairingTrustRegistry {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * Checks whether a device is currently paired in the given scope.
     */
    isDevicePaired(deviceId, scopeString) {
        const record = this.registry.getPairingRecord(deviceId, scopeString);
        if (!record) {
            return false;
        }
        return ((record.pairingState === 'PAIRED' || record.pairingState === 'TRUSTED') &&
            !record.revoked);
    }
    /**
     * Checks whether a device has active authoritative trust in the given scope.
     */
    isDeviceTrusted(deviceId, scopeString) {
        const record = this.registry.getPairingRecord(deviceId, scopeString);
        if (!record || record.revoked || record.pairingState !== 'TRUSTED') {
            return false;
        }
        const trust = this.registry.getTrustRecord(deviceId, scopeString);
        return trust !== undefined && trust.active && trust.trustLevel === 'TRUSTED';
    }
    /**
     * Retrieves the current DeviceTrustLevel for a device in the given scope.
     */
    getDeviceTrustLevel(deviceId, scopeString) {
        const record = this.registry.getPairingRecord(deviceId, scopeString);
        if (!record) {
            return 'NONE';
        }
        if (record.revoked || record.pairingState === 'REVOKED') {
            return 'REVOKED';
        }
        return record.trustLevel;
    }
    /**
     * Checks whether a device is marked as revoked.
     */
    isDeviceRevoked(deviceId, scopeString) {
        return this.registry.isDeviceRevoked(deviceId, scopeString);
    }
    /**
     * Retrieves the PairingRecord for a device in the given scope.
     */
    getPairingRecord(deviceId, scopeString) {
        return this.registry.getPairingRecord(deviceId, scopeString);
    }
    /**
     * Retrieves the TrustRecord for a device in the given scope.
     */
    getTrustRecord(deviceId, scopeString) {
        return this.registry.getTrustRecord(deviceId, scopeString);
    }
}
