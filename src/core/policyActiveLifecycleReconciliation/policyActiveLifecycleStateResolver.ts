// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleStateResolver.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Active Policy State Resolver (Component 820).
// Resolves and structurally validates the durable ActivePolicyState produced by MS-1.3.70.
// Enforces tenant partition isolation, field completeness, and immutable integrity.
//
// Core Authority Invariants:
// - RESOLVER_GRANTS_ZERO_AUTHORITY: Produces read-only state verification
// - ACTIVE_POLICY != RECONCILIATION_RESULT
// - FAIL_CLOSED on missing, malformed, or cross-tenant records
// - USER_STOP > EVERYTHING

import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';

export interface ResolvedActivePolicyStateResult {
  readonly exists: boolean;
  readonly valid: boolean;
  readonly activePolicyState: ActivePolicyState | null;
  readonly failureReasons: readonly string[];
}

export class PolicyActiveLifecycleStateResolver {
  private readonly baseDir: string;
  private readonly stateStore: PolicyActivationStateStore;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyActiveLifecycleReconciliationOptions,
    stateStore?: PolicyActivationStateStore
  ) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.stateStore = stateStore ?? new PolicyActivationStateStore(options);
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy state resolution suspended by USER_STOP supremacy');
    }
  }

  /**
   * Resolves and structurally checks the active policy state for a tenant.
   */
  public resolveActiveState(tenantPartition: string): ResolvedActivePolicyStateResult {
    this.assertUserStopInactive();

    const failureReasons: string[] = [];

    // 1. Tenant identifier validation
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      return {
        exists: false,
        valid: false,
        activePolicyState: null,
        failureReasons: ['TENANT_PARTITION_EMPTY: tenantPartition must be a non-empty string'],
      };
    }

    const cleanTenant = tenantPartition.trim();

    // 2. Partition isolation and security guard check
    let resolvedPartitionKey: string;
    try {
      const resolved = resolveUserPartition(cleanTenant, this.baseDir);
      resolvedPartitionKey = resolved.partitionKey;
    } catch (err: any) {
      return {
        exists: false,
        valid: false,
        activePolicyState: null,
        failureReasons: [`TENANT_ISOLATION_BREACH: ${err.message}`],
      };
    }

    // 3. Resolve active policy from store
    let activeState: ActivePolicyState | null = null;
    try {
      activeState = this.stateStore.getActivePolicy(resolvedPartitionKey);
    } catch (err: any) {
      return {
        exists: false,
        valid: false,
        activePolicyState: null,
        failureReasons: [`STORE_READ_ERROR: ${err.message}`],
      };
    }

    if (!activeState) {
      return {
        exists: false,
        valid: false,
        activePolicyState: null,
        failureReasons: ['ACTIVE_POLICY_MISSING: No durable active policy found for tenant partition'],
      };
    }

    // 4. Structural validation of required fields
    if (!activeState.activePolicyStateId || typeof activeState.activePolicyStateId !== 'string') {
      failureReasons.push('FIELD_MISSING: activePolicyStateId is missing or malformed');
    }
    if (!activeState.activationCommitId || typeof activeState.activationCommitId !== 'string') {
      failureReasons.push('FIELD_MISSING: activationCommitId is missing or malformed');
    }
    if (!activeState.stagedActivationId || typeof activeState.stagedActivationId !== 'string') {
      failureReasons.push('FIELD_MISSING: stagedActivationId is missing or malformed');
    }
    if (!activeState.candidateDraftId || typeof activeState.candidateDraftId !== 'string') {
      failureReasons.push('FIELD_MISSING: candidateDraftId is missing or malformed');
    }
    if (!activeState.tenantPartition || activeState.tenantPartition !== resolvedPartitionKey) {
      failureReasons.push(`TENANT_MISMATCH: record tenantPartition '${activeState.tenantPartition}' does not match expected '${resolvedPartitionKey}'`);
    }
    if (!activeState.activePolicyVersion || typeof activeState.activePolicyVersion !== 'string') {
      failureReasons.push('FIELD_MISSING: activePolicyVersion is missing or malformed');
    }
    if (!activeState.activatedAt || isNaN(Date.parse(activeState.activatedAt))) {
      failureReasons.push('FIELD_INVALID: activatedAt timestamp is missing or invalid');
    }
    if (!activeState.provenanceHeadHash || typeof activeState.provenanceHeadHash !== 'string') {
      failureReasons.push('FIELD_MISSING: provenanceHeadHash is missing or malformed');
    }
    if (activeState.isActivePolicy !== true) {
      failureReasons.push('INVARIANT_VIOLATION: isActivePolicy flag must be strictly true on active policy');
    }
    if (activeState.isActivated !== true) {
      failureReasons.push('INVARIANT_VIOLATION: isActivated flag must be strictly true on active policy');
    }

    const isValid = failureReasons.length === 0;

    return {
      exists: true,
      valid: isValid,
      activePolicyState: isValid ? Object.freeze({ ...activeState }) : null,
      failureReasons: Object.freeze(failureReasons),
    };
  }
}
