import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { ScopedConnectionIdentity } from '../connection/connectionTypes.js';
export interface ScopeValidationResult {
    readonly valid: boolean;
    readonly failureCode?: string;
    readonly failureReason?: string;
}
/**
 * Validates a 9-tuple ScopedDeviceIdentity.
 */
export declare function validateAdmissionDeviceScope(scope: ScopedDeviceIdentity): ScopeValidationResult;
/**
 * Asserts that a 9-tuple ScopedDeviceIdentity is valid.
 */
export declare function assertValidAdmissionDeviceScope(scope: ScopedDeviceIdentity): void;
/**
 * Verifies compatibility between incoming request scope and trusted stored scope.
 * Prevents cross-user, cross-device, cross-brain, cross-surface trust escalation.
 */
export declare function areAdmissionScopesCompatible(requestScope: any, trustedScope: any): boolean;
/**
 * Validates alignment between 9-tuple device scope and 8-tuple connection scope.
 */
export declare function areDeviceAndConnectionScopesAligned(deviceScope: ScopedDeviceIdentity, connectionScope: ScopedConnectionIdentity): boolean;
export declare function validateAdmissionScope(scope1: any, scope2?: any): boolean;
export declare function assertValidAdmissionScope(scope1: any, scope2?: any): void;
export declare function isAdmissionScopeIsolated(scope1: any, scope2: any): boolean;
