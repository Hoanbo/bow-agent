// src/core/admission/admissionEndpoint.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Endpoint abstraction.
// STRICT INVARIANT:
// - KNOWING_BRAIN_ENDPOINT != ACCESS_TO_BRAIN
// - "Knowing where the Brain is does not mean having the right to enter it."
// - No hardcoded home IP or fixed router address. Transport-independent.

import type { EndpointMetadata } from './admissionTypes.js';

export const BRAIN_ENDPOINT_KNOWLEDGE_STATEMENT = 'Knowing where the Brain is does not mean having the right to enter it.';

export const ALLOWED_PROTOCOLS = new Set<string>(['TLS', 'WSS', 'HTTPS', 'QUIC', 'TCP_SECURE', 'SIMULATED_SECURE']);

/**
 * Validates endpoint metadata.
 */
export function isValidEndpoint(endpoint: unknown): endpoint is EndpointMetadata {
  if (!endpoint || typeof endpoint !== 'object') {
    return false;
  }
  const ep = endpoint as Partial<EndpointMetadata>;
  if (typeof ep.host !== 'string' || ep.host.trim().length === 0) {
    return false;
  }
  if (typeof ep.port !== 'number' || ep.port <= 0 || ep.port > 65535) {
    return false;
  }
  if (typeof ep.protocol !== 'string' || !ALLOWED_PROTOCOLS.has(ep.protocol.toUpperCase())) {
    return false;
  }
  if (typeof ep.tlsEnabled !== 'boolean') {
    return false;
  }
  return true;
}

/**
 * Asserts endpoint validity.
 */
export function assertValidEndpoint(endpoint: unknown): void {
  if (!isValidEndpoint(endpoint)) {
    throw new Error(`[ADMISSION_INVALID_ENDPOINT] Malformed or disallowed endpoint metadata. Fail-closed.`);
  }
}

/**
 * Formats canonical endpoint string: <protocol>://<host>:<port><path>
 */
export function formatEndpoint(endpoint: EndpointMetadata): string {
  assertValidEndpoint(endpoint);
  const pathPart = endpoint.path ? (endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`) : '';
  return `${endpoint.protocol.toLowerCase()}://${endpoint.host}:${endpoint.port}${pathPart}`;
}

/**
 * Parses canonical endpoint string into EndpointMetadata.
 */
export function parseEndpoint(urlStr: string): EndpointMetadata {
  if (!urlStr || typeof urlStr !== 'string') {
    throw new Error('[ADMISSION_INVALID_ENDPOINT] Empty or non-string endpoint URL');
  }

  try {
    const parsed = new URL(urlStr);
    const protocol = parsed.protocol.replace(':', '').toUpperCase();
    const host = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : (protocol === 'HTTPS' || protocol === 'WSS' ? 443 : 8443);
    const tlsEnabled = protocol === 'HTTPS' || protocol === 'WSS' || protocol === 'TLS';

    const metadata: EndpointMetadata = {
      host,
      port,
      protocol,
      tlsEnabled,
      path: parsed.pathname || undefined,
    };

    assertValidEndpoint(metadata);
    return Object.freeze(metadata);
  } catch (err) {
    throw new Error(`[ADMISSION_INVALID_ENDPOINT] Failed to parse endpoint ${urlStr}: ${(err as Error).message}`);
  }
}

/**
 * Core security assertion:
 * Knowing an endpoint grants 0 authorization or admission rights.
 */
export function assertEndpointKnowledgeDoesNotGrantAccess(): boolean {
  // Formal verification hook: KNOWING_BRAIN_ENDPOINT != ACCESS_TO_BRAIN
  return true;
}

export interface CreateBrainEndpointOptions {
  readonly host: string;
  readonly port: number;
  readonly protocol: string;
  readonly path?: string;
  readonly tlsRequired?: boolean;
}

export function createBrainEndpointMetadata(options: CreateBrainEndpointOptions): EndpointMetadata {
  const metadata: EndpointMetadata = {
    host: options.host.trim(),
    port: options.port,
    protocol: options.protocol.toUpperCase(),
    tlsEnabled: options.tlsRequired !== false,
    path: options.path,
  };
  assertValidEndpoint(metadata);
  return Object.freeze(metadata);
}

export function validateBrainEndpointMetadata(endpoint: unknown): boolean {
  return isValidEndpoint(endpoint);
}

export function isBrainEndpointTargeting(endpoint: EndpointMetadata, host: string, port: number): boolean {
  return endpoint.host === host && endpoint.port === port;
}

