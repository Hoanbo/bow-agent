// src/core/relay/relayEndpoint.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Transport-independent Relay Endpoint abstraction.
//
// INVARIANTS:
// - ENDPOINT_KNOWLEDGE != ACCESS
// - Network location is NOT identity or authorization.
// - Brain does not hardcode home IPs or router SSIDs.

import type { RelayEndpointMetadata } from './relayTypes.js';

export class RelayEndpointError extends Error {
  constructor(message: string) {
    super(`RELAY_ENDPOINT_ERROR: ${message}`);
    this.name = 'RelayEndpointError';
  }
}

/**
 * Validates the syntactic and architectural integrity of a RelayEndpointMetadata object.
 */
export function validateRelayEndpoint(endpoint: RelayEndpointMetadata): void {
  if (!endpoint) {
    throw new RelayEndpointError('Endpoint metadata is required.');
  }
  if (!endpoint.host || typeof endpoint.host !== 'string' || endpoint.host.trim().length === 0) {
    throw new RelayEndpointError('Endpoint host must be a non-empty string.');
  }
  if (!Number.isInteger(endpoint.port) || endpoint.port < 1 || endpoint.port > 65535) {
    throw new RelayEndpointError(`Invalid endpoint port: ${endpoint.port}. Must be 1-65535.`);
  }
  const validProtocols = ['wss', 'https', 'quic', 'tls', 'test-in-memory'];
  if (!validProtocols.includes(endpoint.protocol)) {
    throw new RelayEndpointError(
      `Unsupported relay protocol: ${endpoint.protocol}. Allowed: ${validProtocols.join(', ')}`
    );
  }
  if (endpoint.protocol !== 'test-in-memory' && !endpoint.isLocal && !endpoint.tlsRequired) {
    throw new RelayEndpointError('Remote non-local relay endpoints MUST require TLS.');
  }
}

/**
 * Formats an endpoint metadata object into a canonical URI string.
 */
export function formatRelayEndpointUrl(endpoint: RelayEndpointMetadata): string {
  validateRelayEndpoint(endpoint);
  if (endpoint.protocol === 'test-in-memory') {
    return `memory://${endpoint.host}:${endpoint.port}`;
  }
  return `${endpoint.protocol}://${endpoint.host}:${endpoint.port}`;
}

/**
 * Compares two endpoints for routing equivalence.
 */
export function areEndpointsEquivalent(
  a: RelayEndpointMetadata,
  b: RelayEndpointMetadata
): boolean {
  if (!a || !b) return false;
  return a.host.toLowerCase() === b.host.toLowerCase() && a.port === b.port && a.protocol === b.protocol;
}

/**
 * Enforces the core invariant: Knowing the endpoint never grants authorization or access.
 */
export function assertRelayEndpointKnowledgeDoesNotGrantAccess(
  hasEndpointInfo: boolean,
  isAdmitted: boolean
): void {
  if (hasEndpointInfo && !isAdmitted) {
    throw new RelayEndpointError(
      'INVARIANT_ENFORCED: ENDPOINT_KNOWLEDGE != ACCESS. Relay connection rejected without Zero-Trust admission.'
    );
  }
}
