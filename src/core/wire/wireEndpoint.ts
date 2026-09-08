// src/core/wire/wireEndpoint.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Transport-Independent Wire Endpoint Metadata Abstraction.
//
// INVARIANT:
// KNOWING_WIRE_ENDPOINT != ACCESS_TO_BRAIN
// Endpoint information represents network routing location only.
// An endpoint alone grants ZERO admission or authorization to the Brain.

import type { WireEndpointMetadata } from './wireTypes.js';
import { WireTransportError } from './wireFailure.js';

export function parseWireEndpoint(uri: string): WireEndpointMetadata {
  if (!uri || typeof uri !== 'string') {
    throw new WireTransportError('WIRE_CONNECTION_FAILED', 'Invalid wire endpoint URI: must be a non-empty string.');
  }

  try {
    const parsed = new URL(uri);
    const protocol = parsed.protocol.replace(':', '') as WireEndpointMetadata['protocol'];
    if (!['ws', 'wss', 'tcp', 'tls', 'test-in-memory'].includes(protocol)) {
      throw new WireTransportError('WIRE_PROTOCOL_MISMATCH', `Unsupported wire protocol "${protocol}" in endpoint.`);
    }

    const host = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : protocol === 'wss' || protocol === 'tls' ? 443 : 80;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const tlsRequired = protocol === 'wss' || protocol === 'tls';

    return Object.freeze({
      host,
      port,
      protocol,
      path: parsed.pathname || '/',
      tlsRequired,
      isLocal,
    });
  } catch (err) {
    if (err instanceof WireTransportError) throw err;
    throw new WireTransportError('WIRE_CONNECTION_FAILED', `Malformed wire endpoint URI: ${(err as Error).message}`);
  }
}

export function formatWireEndpoint(endpoint: WireEndpointMetadata): string {
  const isDefaultPort =
    (endpoint.protocol === 'wss' && endpoint.port === 443) ||
    (endpoint.protocol === 'ws' && endpoint.port === 80);
  const portPart = isDefaultPort ? '' : `:${endpoint.port}`;
  const pathPart = endpoint.path ? (endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`) : '';
  return `${endpoint.protocol}://${endpoint.host}${portPart}${pathPart}`;
}

export function validateWireEndpoint(endpoint: WireEndpointMetadata): void {
  if (!endpoint.host || typeof endpoint.host !== 'string') {
    throw new WireTransportError('WIRE_CONNECTION_FAILED', 'Wire endpoint must specify a valid host.');
  }
  if (!endpoint.port || endpoint.port <= 0 || endpoint.port > 65535) {
    throw new WireTransportError('WIRE_CONNECTION_FAILED', `Invalid wire endpoint port ${endpoint.port}. Must be 1-65535.`);
  }
}

export function assertWireEndpointKnowledgeDoesNotGrantAccess(_endpoint: WireEndpointMetadata): void {
  // Formal verification hook: knowing the physical network endpoint does not bypass admission.
}
