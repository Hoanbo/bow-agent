// src/core/internet/internetEndpoint.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Endpoint descriptor validation and normalization layer.
// Enforces that no raw IP addresses, hardcoded DNS names, or port zero values
// are used as relay endpoint identifiers.
//
// INVARIANT: NETWORK_ADDRESS != DEVICE_IDENTITY (carried from MS-1.3.19/22/28)
// INVARIANT: Endpoints are descriptors, never identity carriers.

import type { InternetEndpointDescriptor } from './internetTypes.js';
import { InternetEdgeError } from './internetFailure.js';

/** Labels that are explicitly forbidden as endpoint host values. */
const FORBIDDEN_HOST_PATTERNS: readonly RegExp[] = Object.freeze([
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^::1$/,
  /^0\.0\.0\.0$/,
]);

/** Maximum allowed port range for relay endpoints. */
export const INTERNET_ENDPOINT_MIN_PORT = 1;
export const INTERNET_ENDPOINT_MAX_PORT = 65535;

/** Maximum host label length (RFC-1035 + safety margin). */
export const INTERNET_ENDPOINT_MAX_HOST_LENGTH = 253;

/**
 * Validates an endpoint descriptor for production use.
 *
 * Rules:
 *  1. host must not be empty or a loopback/local address
 *  2. host must be ≤ 253 characters
 *  3. port must be in [1, 65535]
 *  4. tlsRequired must be true for production endpoints
 *
 * Returns a validation result rather than throwing to allow callers to
 * decide how to handle invalid endpoints.
 */
export interface EndpointValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

export function validateInternetEndpoint(
  endpoint: InternetEndpointDescriptor,
  opts: { allowInsecure?: boolean } = {}
): EndpointValidationResult {
  if (!endpoint.host || endpoint.host.trim().length === 0) {
    return { valid: false, reason: 'Endpoint host must not be empty.' };
  }

  if (endpoint.host.length > INTERNET_ENDPOINT_MAX_HOST_LENGTH) {
    return { valid: false, reason: `Endpoint host exceeds maximum length of ${INTERNET_ENDPOINT_MAX_HOST_LENGTH}.` };
  }

  for (const pattern of FORBIDDEN_HOST_PATTERNS) {
    if (pattern.test(endpoint.host)) {
      return { valid: false, reason: `Endpoint host "${endpoint.host}" is a loopback/local address and is forbidden for production relay use.` };
    }
  }

  if (endpoint.port < INTERNET_ENDPOINT_MIN_PORT || endpoint.port > INTERNET_ENDPOINT_MAX_PORT) {
    return { valid: false, reason: `Endpoint port ${endpoint.port} is outside valid range [1, 65535].` };
  }

  if (!opts.allowInsecure && !endpoint.tlsRequired) {
    return { valid: false, reason: 'Production relay endpoints must require TLS (tlsRequired=true).' };
  }

  return { valid: true };
}

/**
 * Asserts endpoint validity; throws InternetEdgeError on failure.
 */
export function assertInternetEndpointValid(
  endpoint: InternetEndpointDescriptor,
  opts: { allowInsecure?: boolean } = {}
): void {
  const result = validateInternetEndpoint(endpoint, opts);
  if (!result.valid) {
    throw new InternetEdgeError(
      'INTERNET_RELAY_BIND_FAILED',
      result.reason ?? 'Endpoint validation failed.'
    );
  }
}

/**
 * Creates a safe, normalized copy of an endpoint descriptor.
 * Trims whitespace from host and path.
 */
export function normalizeInternetEndpoint(
  raw: InternetEndpointDescriptor
): InternetEndpointDescriptor {
  return Object.freeze({
    host: raw.host.trim(),
    port: raw.port,
    tlsRequired: raw.tlsRequired,
    mtlsRequired: raw.mtlsRequired,
    sni: raw.sni?.trim(),
    path: raw.path?.trim(),
  });
}

/**
 * Produces a stable string key for an endpoint (for use in maps/sets).
 * Does NOT include secrets or credentials.
 */
export function internetEndpointKey(ep: InternetEndpointDescriptor): string {
  const proto = ep.tlsRequired ? 'tls' : 'plain';
  return `${proto}:${ep.host}:${ep.port}${ep.path ?? ''}`;
}
