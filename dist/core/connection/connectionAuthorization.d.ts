import type { ScopedConnectionIdentity, ConnectionCapability } from './connectionTypes.js';
export interface AuthorizationResult {
    readonly authorized: boolean;
    readonly grantedCapabilities: readonly ConnectionCapability[];
    readonly rejectedCapabilities: readonly string[];
    readonly error?: string;
    readonly fingerprint: string;
}
/**
 * Checks whether a capability string is one of the allowed safe data capabilities
 */
export declare function isAllowedCapability(cap: string): cap is ConnectionCapability;
/**
 * Checks whether a capability string is one of the strictly forbidden cognitive/execution capabilities
 */
export declare function isForbiddenCapability(cap: string): boolean;
/**
 * Asserts that none of the capabilities are forbidden, failing closed immediately on detection
 */
export declare function assertSafeCapabilities(capabilities: readonly string[]): void;
/**
 * Authorizes requested capabilities against allowed data capabilities and granted policy capabilities
 */
export declare function authorizeConnectionCapabilities(identity: ScopedConnectionIdentity, requested: readonly string[], policyGranted?: readonly ConnectionCapability[]): Readonly<AuthorizationResult>;
