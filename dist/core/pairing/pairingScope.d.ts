import type { ScopedDeviceIdentity } from './pairingTypes.js';
export declare const SECRET_PATTERNS: RegExp[];
/**
 * Validates an individual scope segment against security constraints.
 */
export declare function validatePairingScopeSegment(segment: string, segmentName: string): void;
export declare const validateScopeSegment: typeof validatePairingScopeSegment;
/**
 * Creates canonical 9-tuple scope string.
 */
export declare function createDeviceScope(identity: ScopedDeviceIdentity): string;
/**
 * Parses a canonical 9-tuple scope string back into ScopedDeviceIdentity.
 */
export declare function parseDeviceScope(scopeString: string): ScopedDeviceIdentity;
/**
 * Compares two 9-tuple ScopedDeviceIdentity objects for strict equality.
 */
export declare function areDeviceScopesEqual(a: ScopedDeviceIdentity, b: ScopedDeviceIdentity): boolean;
export declare const areScopesEqual: typeof areDeviceScopesEqual;
/**
 * Asserts that two scopes match exactly; fails closed with typed error message otherwise.
 */
export declare function assertDeviceScopeMatches(expected: ScopedDeviceIdentity, actual: ScopedDeviceIdentity): void;
export declare const assertScopeMatches: typeof assertDeviceScopeMatches;
/**
 * Recursively scrubs sensitive secrets from an arbitrary object.
 * Replaces values of matching sensitive keys with '[REDACTED]'.
 */
export declare function scrubPairingSecrets<T>(data: T): T;
export declare const scrubSecrets: typeof scrubPairingSecrets;
