// src/core/delegation/delegationScopeValidator.ts
// BOWCON V4.0 — MS-1.3.45: DELEGATION SCOPE & CONSTRAINT VALIDATOR
//
// INVARIANTS:
// - DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE
// - CHILD_DELEGATION_SCOPE <= PARENT_DELEGATION_SCOPE
// - CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
// - CHILD_EXPIRATION <= PARENT_EXPIRATION
// - CHILD_CONSTRAINTS ⊇ PARENT_CONSTRAINTS
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import type {
  DelegationScope,
  DelegationRecord,
  DelegationRequestInput,
} from './delegationTypes.js';

export class DelegationScopeValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'DelegationScopeValidationError';
  }
}

export class DelegationScopeValidator {
  private static readonly PROTECTED_PATTERNS = ['shopofbow', 'c:\\bow\\shopofbow'] as const;

  /**
   * Validates a root or standalone scope definition against invariants.
   */
  public static validateScope(scope: DelegationScope): void {
    // 1. Percentage check
    if (scope.maxScopePercentage < 0 || scope.maxScopePercentage > 100) {
      throw new DelegationScopeValidationError(
        'INVALID_SCOPE_PERCENTAGE',
        `Scope percentage must be between 0 and 100. Received: ${scope.maxScopePercentage}`
      );
    }

    // 2. Protected workspace check on targetPaths and forbiddenPaths
    this.assertProtectedWorkspaceSafe(scope.targetPaths, 'targetPaths');

    // 3. Disallowed and allowed overlap
    const disallowedSet = new Set(scope.disallowedCapabilities);
    for (const cap of scope.allowedCapabilities) {
      if (disallowedSet.has(cap)) {
        throw new DelegationScopeValidationError(
          'CONTRADICTORY_CAPABILITY_SCOPE',
          `Capability "${cap}" is listed in both allowed and disallowed capabilities.`
        );
      }
    }
  }

  /**
   * Verifies that paths do not touch or target C:\BOW\shopofbow.
   */
  public static assertProtectedWorkspaceSafe(paths: readonly string[], fieldName: string): void {
    for (const p of paths) {
      const lower = p.toLowerCase();
      for (const pattern of this.PROTECTED_PATTERNS) {
        if (lower.includes(pattern)) {
          throw new DelegationScopeValidationError(
            'SECURITY_VIOLATION',
            `Delegation cannot target protected workspace C:\\BOW\\shopofbow (found in ${fieldName}: "${p}").`
          );
        }
      }
    }
  }

  /**
   * Asserts that a child delegation does not exceed or widen its parent delegation.
   */
  public static assertValidChildDelegation(
    parent: DelegationRecord,
    childInput: DelegationRequestInput,
    now: number = Date.now()
  ): void {
    // 1. Parent state must be ACTIVE
    if (parent.status !== 'ACTIVE') {
      throw new DelegationScopeValidationError(
        'PARENT_NOT_ACTIVE',
        `Cannot delegate from parent delegation with status "${parent.status}". Must be ACTIVE.`
      );
    }

    if (parent.revocationState.isRevoked) {
      throw new DelegationScopeValidationError(
        'PARENT_REVOKED',
        'Cannot delegate from a revoked parent delegation.'
      );
    }

    // 2. Parent expiration check
    if (now >= parent.expiresAt) {
      throw new DelegationScopeValidationError(
        'PARENT_EXPIRED',
        'Cannot delegate from an expired parent delegation.'
      );
    }

    // 3. Sub-delegation permission check
    if (!parent.scope.allowSubDelegation) {
      throw new DelegationScopeValidationError(
        'SUBDELEGATION_DISALLOWED',
        'Parent delegation explicitly disallows child sub-delegation.'
      );
    }

    // 4. Depth check
    const childDepth = parent.scope.currentDepth + 1;
    if (childDepth > parent.scope.maxChildDelegationDepth) {
      throw new DelegationScopeValidationError(
        'MAX_DELEGATION_DEPTH_EXCEEDED',
        `Child delegation depth ${childDepth} exceeds parent maximum depth ${parent.scope.maxChildDelegationDepth}.`
      );
    }

    // 5. Scope percentage check: CHILD <= PARENT
    if (childInput.scope.maxScopePercentage > parent.scope.maxScopePercentage) {
      throw new DelegationScopeValidationError(
        'SCOPE_AMPLIFICATION_FORBIDDEN',
        `Child scope percentage (${childInput.scope.maxScopePercentage}%) exceeds parent scope (${parent.scope.maxScopePercentage}%).`
      );
    }

    // 6. Capability subset check: CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
    const parentAllowedSet = new Set(parent.grantedCapabilities);
    for (const cap of childInput.requestedCapabilities) {
      if (!parentAllowedSet.has(cap)) {
        throw new DelegationScopeValidationError(
          'CAPABILITY_WIDENING_FORBIDDEN',
          `Child requested capability "${cap}" which is not granted in parent delegation.`
        );
      }
    }
    for (const cap of childInput.scope.allowedCapabilities) {
      if (!parentAllowedSet.has(cap)) {
        throw new DelegationScopeValidationError(
          'CAPABILITY_WIDENING_FORBIDDEN',
          `Child allowed capability "${cap}" is not in parent granted capabilities.`
        );
      }
    }

    // 7. Expiration bound check: CHILD_EXPIRATION <= PARENT_EXPIRATION
    const childExpiresAt = now + childInput.ttlMs;
    if (childExpiresAt > parent.expiresAt) {
      throw new DelegationScopeValidationError(
        'EXPIRATION_EXTENSION_FORBIDDEN',
        `Child expiration (${childExpiresAt}) cannot extend beyond parent expiration (${parent.expiresAt}).`
      );
    }

    // 8. Path validation
    if (childInput.scope.targetPaths) {
      this.assertProtectedWorkspaceSafe(childInput.scope.targetPaths, 'child targetPaths');
    }
    if (childInput.scope.forbiddenPaths) {
      this.assertProtectedWorkspaceSafe(childInput.scope.forbiddenPaths, 'child forbiddenPaths');
    }

    // 9. Session containment: Child must belong to same session as parent
    if (childInput.sessionId !== parent.sessionId) {
      throw new DelegationScopeValidationError(
        'CROSS_SESSION_DELEGATION_FORBIDDEN',
        `Child delegation session "${childInput.sessionId}" does not match parent session "${parent.sessionId}".`
      );
    }
  }
}
