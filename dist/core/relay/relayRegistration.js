// src/core/relay/relayRegistration.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Explicit Relay registration with Brain infrastructure.
//
// INVARIANTS:
// - Registration MUST NOT grant device execution authority.
// - Registration MUST NOT grant Brain authority.
// - Registration MUST NOT grant tool execution authority.
// - REGISTRATION != ADMISSION
// - REGISTRATION != EXECUTION_AUTHORITY
import { RELAY_PROTOCOL_VERSION } from './relayTypes.js';
import { isValidRelayId } from './relayIdentity.js';
import { validateRelayEndpoint } from './relayEndpoint.js';
export class RelayRegistrationError extends Error {
    constructor(message) {
        super(`RELAY_REGISTRATION_ERROR: ${message}`);
        this.name = 'RelayRegistrationError';
    }
}
/**
 * Validates the cryptographic and structural integrity of a RelayRegistration request.
 */
export function validateRelayRegistration(reg) {
    if (!reg)
        throw new RelayRegistrationError('Registration payload cannot be null.');
    if (!isValidRelayId(reg.relayId)) {
        throw new RelayRegistrationError(`Invalid relayId: ${reg.relayId}`);
    }
    if (reg.version !== RELAY_PROTOCOL_VERSION) {
        throw new RelayRegistrationError(`Version incompatibility: Relay is ${reg.version}, Brain requires ${RELAY_PROTOCOL_VERSION}`);
    }
    validateRelayEndpoint(reg.advertisedEndpoint);
    if (!reg.supportedProtocols || reg.supportedProtocols.length === 0) {
        throw new RelayRegistrationError('Relay must support at least one protocol.');
    }
    if (!reg.capabilities || !reg.capabilities.includes('ROUTING')) {
        throw new RelayRegistrationError('Relay must at minimum possess ROUTING capability.');
    }
    if (!reg.scope || !reg.scope.brainId || !reg.scope.tenantId) {
        throw new RelayRegistrationError('Relay scope must designate brainId and tenantId.');
    }
    if (!reg.scope.allowedSurfaces || reg.scope.allowedSurfaces.length === 0) {
        throw new RelayRegistrationError('Relay scope must permit at least one surface type.');
    }
}
/**
 * In-memory registry manager for registered relays.
 */
export class RelayRegistrationManager {
    registrations = new Map();
    register(registration) {
        validateRelayRegistration(registration);
        if (this.registrations.has(registration.relayId)) {
            const existing = this.registrations.get(registration.relayId);
            if (existing.status === 'REVOKED') {
                throw new RelayRegistrationError(`Relay ${registration.relayId} has been REVOKED. Registration rejected.`);
            }
        }
        this.registrations.set(registration.relayId, Object.freeze({ ...registration }));
    }
    unregister(relayId) {
        return this.registrations.delete(relayId);
    }
    getRegistration(relayId) {
        return this.registrations.get(relayId);
    }
    isRegistered(relayId) {
        const reg = this.registrations.get(relayId);
        return reg !== undefined && reg.status === 'ACTIVE';
    }
    revoke(relayId) {
        const existing = this.registrations.get(relayId);
        if (existing) {
            this.registrations.set(relayId, Object.freeze({
                ...existing,
                status: 'REVOKED',
            }));
        }
    }
    listRegistrations() {
        return Array.from(this.registrations.values());
    }
    clear() {
        this.registrations.clear();
    }
}
