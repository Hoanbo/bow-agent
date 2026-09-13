// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleTenantConsistencyEngine.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Tenant Consistency Engine (Component 825).
// Enforces tenant partition isolation, path traversal prevention, Windows reserved name checks,
// and cross-tenant boundary integrity via resolveUserPartition.
//
// Core Authority Invariants:
// - TENANT_A != TENANT_B
// - ANONYMOUS_AND_GUEST_ACCESS_DENIED
// - PATH_TRAVERSAL_REJECTED
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import type {
  LifecycleDriftRecord,
  LifecycleBoundaryCheckResult,
  PolicyActiveLifecycleReconciliationOptions,
} from './policyActiveLifecycleReconciliationTypes.js';
import {
  createLifecycleDriftId,
  createLifecycleConsistencyCheckId,
} from './policyActiveLifecycleReconciliationTypes.js';

export interface TenantConsistencyCheckResult {
  readonly valid: boolean;
  readonly sanitizedPartitionKey: string;
  readonly detectedDrifts: readonly LifecycleDriftRecord[];
  readonly boundaryChecks: readonly LifecycleBoundaryCheckResult[];
  readonly blockingReasons: readonly string[];
}

export class PolicyActiveLifecycleTenantConsistencyEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyActiveLifecycleReconciliationOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Tenant consistency check suspended by USER_STOP supremacy');
    }
  }

  /**
   * Verifies that a tenant partition is safe, legal, and isolated.
   */
  public verifyTenantPartition(tenantPartition: string): TenantConsistencyCheckResult {
    this.assertUserStopInactive();

    const drifts: LifecycleDriftRecord[] = [];
    const boundaryChecks: LifecycleBoundaryCheckResult[] = [];
    const blockingReasons: string[] = [];

    // 1. Basic validation
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      drifts.push({
        driftId: createLifecycleDriftId(`drift_tnt_${Date.now()}_empty`),
        category: 'TENANT_ISOLATION_BREACH',
        severity: 'CRITICAL',
        expected: 'Non-empty tenant identifier',
        observed: 'empty/null/undefined',
        message: 'Tenant partition identifier cannot be empty or non-string',
        governanceBoundaryViolated: 'Multi-Tenant Partition Boundary',
        requiresHumanIntervention: true,
        detectedAt: new Date().toISOString(),
      });
      blockingReasons.push('TENANT_IDENTIFIER_EMPTY');
      return {
        valid: false,
        sanitizedPartitionKey: '',
        detectedDrifts: Object.freeze(drifts),
        boundaryChecks: Object.freeze(boundaryChecks),
        blockingReasons: Object.freeze(blockingReasons),
      };
    }

    const trimmed = tenantPartition.trim();

    // 2. Reject anonymous or guest access
    if (trimmed.toLowerCase() === 'anonymous' || trimmed.toLowerCase() === 'guest') {
      drifts.push({
        driftId: createLifecycleDriftId(`drift_tnt_${Date.now()}_anon`),
        category: 'TENANT_ISOLATION_BREACH',
        severity: 'CRITICAL',
        expected: 'Authenticated tenant identity',
        observed: trimmed,
        message: `Anonymous or guest access strictly rejected: '${trimmed}'`,
        governanceBoundaryViolated: 'Multi-Tenant Zero Trust Boundary',
        requiresHumanIntervention: true,
        detectedAt: new Date().toISOString(),
      });
      blockingReasons.push('ANONYMOUS_OR_GUEST_ACCESS_REJECTED');
      return {
        valid: false,
        sanitizedPartitionKey: '',
        detectedDrifts: Object.freeze(drifts),
        boundaryChecks: Object.freeze(boundaryChecks),
        blockingReasons: Object.freeze(blockingReasons),
      };
    }

    // 3. Resolve user partition through resolveUserPartition
    let resolvedKey = '';
    try {
      const resolved = resolveUserPartition(trimmed, this.baseDir);
      resolvedKey = resolved.partitionKey;
    } catch (err: any) {
      drifts.push({
        driftId: createLifecycleDriftId(`drift_tnt_${Date.now()}_resolve`),
        category: 'TENANT_ISOLATION_BREACH',
        severity: 'CRITICAL',
        expected: 'Valid sanitized partition key',
        observed: err.message,
        message: `Tenant resolution failed security invariants: ${err.message}`,
        governanceBoundaryViolated: 'resolveUserPartition Boundary',
        requiresHumanIntervention: true,
        detectedAt: new Date().toISOString(),
      });
      blockingReasons.push(`TENANT_RESOLUTION_FAILED: ${err.message}`);
      return {
        valid: false,
        sanitizedPartitionKey: '',
        detectedDrifts: Object.freeze(drifts),
        boundaryChecks: Object.freeze(boundaryChecks),
        blockingReasons: Object.freeze(blockingReasons),
      };
    }

    boundaryChecks.push({
      checkId: createLifecycleConsistencyCheckId(`chk_tnt_${Date.now()}`),
      boundaryName: 'TENANT_PARTITION_ISOLATION',
      passed: true,
      details: { tenantPartition: trimmed, resolvedKey },
      blockingReasons: [],
      checkedAt: new Date().toISOString(),
    });

    return {
      valid: true,
      sanitizedPartitionKey: resolvedKey,
      detectedDrifts: Object.freeze(drifts),
      boundaryChecks: Object.freeze(boundaryChecks),
      blockingReasons: Object.freeze(blockingReasons),
    };
  }
}
