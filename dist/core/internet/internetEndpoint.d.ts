import type { InternetEndpointDescriptor } from './internetTypes.js';
/** Maximum allowed port range for relay endpoints. */
export declare const INTERNET_ENDPOINT_MIN_PORT = 1;
export declare const INTERNET_ENDPOINT_MAX_PORT = 65535;
/** Maximum host label length (RFC-1035 + safety margin). */
export declare const INTERNET_ENDPOINT_MAX_HOST_LENGTH = 253;
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
export declare function validateInternetEndpoint(endpoint: InternetEndpointDescriptor, opts?: {
    allowInsecure?: boolean;
}): EndpointValidationResult;
/**
 * Asserts endpoint validity; throws InternetEdgeError on failure.
 */
export declare function assertInternetEndpointValid(endpoint: InternetEndpointDescriptor, opts?: {
    allowInsecure?: boolean;
}): void;
/**
 * Creates a safe, normalized copy of an endpoint descriptor.
 * Trims whitespace from host and path.
 */
export declare function normalizeInternetEndpoint(raw: InternetEndpointDescriptor): InternetEndpointDescriptor;
/**
 * Produces a stable string key for an endpoint (for use in maps/sets).
 * Does NOT include secrets or credentials.
 */
export declare function internetEndpointKey(ep: InternetEndpointDescriptor): string;
