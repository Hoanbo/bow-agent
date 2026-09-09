// src/core/delegation/federatedDeviceRegistry.ts
// BOWCON V4.0 — MS-1.3.45: FEDERATED DEVICE IDENTITY & TRUST REGISTRY
//
// INVARIANTS:
// - DEVICE_ID != MASTER_OWNER_ID
// - DEVICE_TRUST != EXECUTION_AUTHORITY
// - No device may create an alternative authority root.
// - Devices are bounded to Master Owner governance.
import { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, } from './delegationTypes.js';
export class FederatedDeviceError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'FederatedDeviceError';
    }
}
export class FederatedDeviceRegistry {
    devices = new Map();
    /**
     * Registers a device in the federation registry.
     */
    registerDevice(input) {
        const rawId = input.deviceId.trim();
        const normalized = rawId.toLowerCase();
        // Invariant: DEVICE_ID != MASTER_OWNER_ID
        if (normalized === MASTER_OWNER_ID.toLowerCase() ||
            AUTHORIZED_MASTER_OWNER_ALIASES.some((alias) => alias.toLowerCase() === normalized) ||
            isMasterOwner(rawId)) {
            throw new FederatedDeviceError('FORBIDDEN_OWNER_DEVICE_IMPERSONATION', `Device cannot be registered with Master Owner identity: "${rawId}". DEVICE != MASTER_OWNER.`);
        }
        if (this.devices.has(rawId)) {
            throw new FederatedDeviceError('DEVICE_ALREADY_REGISTERED', `Device "${rawId}" is already registered in federation registry.`);
        }
        const device = {
            deviceId: rawId,
            ownerId: input.ownerId?.trim() || MASTER_OWNER_ID,
            platform: input.platform || 'unknown',
            hostMode: input.hostMode || 'UNKNOWN',
            trustState: 'REGISTERED',
            capabilitiesSummary: input.capabilitiesSummary ? [...input.capabilitiesSummary] : [],
            lastSeenAt: Date.now(),
            federationStatus: 'ACTIVE',
            isMasterOwner: false,
        };
        this.devices.set(rawId, device);
        return device;
    }
    /**
     * Updates trust state of a federated device.
     * INVARIANT: Promoting to TRUSTED requires Master Owner authority.
     */
    setTrustState(deviceId, newState, actorId) {
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new FederatedDeviceError('DEVICE_NOT_FOUND', `Device "${deviceId}" not found in federation registry.`);
        }
        if (newState === 'TRUSTED' && !isMasterOwner(actorId)) {
            throw new FederatedDeviceError('UNAUTHORIZED_DEVICE_TRUST', `Actor "${actorId}" cannot promote device "${deviceId}" to TRUSTED. Only Master Owner authority can grant trust.`);
        }
        const updated = {
            ...device,
            trustState: newState,
            lastSeenAt: Date.now(),
            federationStatus: newState === 'REVOKED' || newState === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
        };
        this.devices.set(deviceId, updated);
        return updated;
    }
    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }
    hasDevice(deviceId) {
        return this.devices.has(deviceId);
    }
    isDeviceTrusted(deviceId) {
        const device = this.devices.get(deviceId);
        return device?.trustState === 'TRUSTED';
    }
    clear() {
        this.devices.clear();
    }
}
export const globalFederatedDeviceRegistry = new FederatedDeviceRegistry();
