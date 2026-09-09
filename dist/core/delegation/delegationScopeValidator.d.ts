import type { DelegationScope, DelegationRecord, DelegationRequestInput } from './delegationTypes.js';
export declare class DelegationScopeValidationError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, details?: Record<string, unknown> | undefined);
}
export declare class DelegationScopeValidator {
    private static readonly PROTECTED_PATTERNS;
    /**
     * Validates a root or standalone scope definition against invariants.
     */
    static validateScope(scope: DelegationScope): void;
    /**
     * Verifies that paths do not touch or target C:\BOW\shopofbow.
     */
    static assertProtectedWorkspaceSafe(paths: readonly string[], fieldName: string): void;
    /**
     * Asserts that a child delegation does not exceed or widen its parent delegation.
     */
    static assertValidChildDelegation(parent: DelegationRecord, childInput: DelegationRequestInput, now?: number): void;
}
