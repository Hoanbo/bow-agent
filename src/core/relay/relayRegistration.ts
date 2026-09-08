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

import type { RelayRegistration, RelayId } from './relayTypes.js';
import { RELAY_PROTOCOL_VERSION } from './relayTypes.js';
import { isValidRelayId } from './relayIdentity.js';
import { validateRelayEndpoint } from './relayEndpoint.js';

export class RelayRegistrationError extends Error {
  constructor(message: string) {
    super(`RELAY_REGISTRATION_ERROR: ${message}`);
    this.name = 'RelayRegistrationError';
  }
}

/**
 * Validates the cryptographic and structural integrity of a RelayRegistration request.
 */
export function validateRelayRegistration(reg: RelayRegistration): void {
  if (!reg) throw new RelayRegistrationError('Registration payload cannot be null.');
  if (!isValidRelayId(reg.relayId)) {
    throw new RelayRegistrationError(`Invalid relayId: ${reg.relayId}`);
  }
  if (reg.version !== RELAY_PROTOCOL_VERSION) {
    throw new RelayRegistrationError(
      `Version incompatibility: Relay is ${reg.version}, Brain requires ${RELAY_PROTOCOL_VERSION}`
    );
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
  private readonly registrations = new Map<RelayId, RelayRegistration>();

  public register(registration: RelayRegistration): void {
    validateRelayRegistration(registration);
    if (this.registrations.has(registration.relayId)) {
      const existing = this.registrations.get(registration.relayId)!;
      if (existing.status === 'REVOKED') {
        throw new RelayRegistrationError(`Relay ${registration.relayId} has been REVOKED. Registration rejected.`);
      }
    }
    this.registrations.set(registration.relayId, Object.freeze({ ...registration }));
  }

  public unregister(relayId: RelayId): boolean {
    return this.registrations.delete(relayId);
  }

  public getRegistration(relayId: RelayId): RelayRegistration | undefined {
    return this.registrations.get(relayId);
  }

  public isRegistered(relayId: RelayId): boolean {
    const reg = this.registrations.get(relayId);
    return reg !== undefined && reg.status === 'ACTIVE';
  }

  public revoke(relayId: RelayId): void {
    const existing = this.registrations.get(relayId);
    if (existing) {
      this.registrations.set(
        relayId,
        Object.freeze({
          ...existing,
          status: 'REVOKED',
        })
      );
    }
  }

  public listRegistrations(): readonly RelayRegistration[] {
    return Array.from(this.registrations.values());
  }

  public clear(): void {
    this.registrations.clear();
  }
}
