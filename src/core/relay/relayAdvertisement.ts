// src/core/relay/relayAdvertisement.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Observational relay advertisement and discovery mechanisms.
//
// INVARIANTS:
// - ADVERTISED != CONNECTED
// - ADVERTISED != ADMITTED
// - ADVERTISED != TRUSTED

import type { RelayEndpointMetadata, RelayCapability, RelayId } from './relayTypes.js';
import { RELAY_PROTOCOL_VERSION } from './relayTypes.js';
import { validateRelayEndpoint } from './relayEndpoint.js';
import { isValidRelayId } from './relayIdentity.js';

export interface RelayAdvertisement {
  readonly advertisementId: string;
  readonly relayId: RelayId;
  readonly endpoint: RelayEndpointMetadata;
  readonly protocolVersion: string;
  readonly supportedProtocols: readonly string[];
  readonly capabilities: readonly RelayCapability[];
  readonly advertisedAt: number;
  readonly ttlMs: number;
  readonly signature?: string;
}

export class RelayAdvertisementError extends Error {
  constructor(message: string) {
    super(`RELAY_ADVERTISEMENT_ERROR: ${message}`);
    this.name = 'RelayAdvertisementError';
  }
}

/**
 * Validates an incoming relay advertisement envelope.
 */
export function validateRelayAdvertisement(
  adv: RelayAdvertisement,
  now: number = Date.now()
): boolean {
  if (!adv) throw new RelayAdvertisementError('Advertisement is null or undefined.');
  if (!adv.advertisementId || typeof adv.advertisementId !== 'string') {
    throw new RelayAdvertisementError('Invalid advertisementId.');
  }
  if (!isValidRelayId(adv.relayId)) {
    throw new RelayAdvertisementError(`Invalid relayId format in advertisement: ${adv.relayId}`);
  }
  validateRelayEndpoint(adv.endpoint);

  if (adv.protocolVersion !== RELAY_PROTOCOL_VERSION) {
    throw new RelayAdvertisementError(
      `Protocol mismatch: Advertised ${adv.protocolVersion}, expected ${RELAY_PROTOCOL_VERSION}`
    );
  }

  if (!adv.supportedProtocols || adv.supportedProtocols.length === 0) {
    throw new RelayAdvertisementError('Relay must advertise at least one supported protocol.');
  }

  if (!adv.capabilities || adv.capabilities.length === 0) {
    throw new RelayAdvertisementError('Relay must advertise at least one capability.');
  }

  if (now - adv.advertisedAt > adv.ttlMs) {
    throw new RelayAdvertisementError('Relay advertisement has expired (TTL exceeded).');
  }

  return true;
}
