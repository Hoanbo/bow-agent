import type { ScopedConnectionIdentity } from './connectionTypes.js';
/**
 * Validates a single scope segment against security boundaries
 */
export declare function validateScopeSegment(segment: string, segmentName: string): void;
/**
 * Creates canonical 8-tuple scope string
 */
export declare function createConnectionScope(identity: ScopedConnectionIdentity): string;
/**
 * Parses canonical 8-tuple scope string into ScopedConnectionIdentity
 */
export declare function parseConnectionScope(scopeStr: string): ScopedConnectionIdentity;
/**
 * Compares two ScopedConnectionIdentity instances, throwing on mismatch (fail closed)
 */
export declare function assertConnectionScopeMatch(expected: ScopedConnectionIdentity, actual: ScopedConnectionIdentity): void;
/**
 * Recursively deep freezes an object
 */
export declare function deepFreeze<T>(obj: T): Readonly<T>;
/**
 * Scrubs credentials and secrets from text or object structures
 */
export declare function scrubConnectionSecrets<T>(val: T): T;
