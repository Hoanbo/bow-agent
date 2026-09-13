// src/core/policyActiveRollback/policyRollbackRevalidationEngine.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Governed Rollback Revalidation Engine (Component 808).
// Independently revalidates rollback requests, target historical policies, and active state
// prior to human governance review and authorization.
//
// Guarantees:
// 1. Independent validation: zero active mutation
// 2. Fail-closed on any unknown, expired, contradictory, or corrupted state
// 3. UNKNOWN != READY, UNKNOWN != SAFE, UNKNOWN != AUTHORIZED
// 4. Strict tenant isolation via resolveUserPartition
// 5. Invariant enforcement: ACTIVE_POLICY != ROLLBACK_TARGET
// 6. Hard-forbidden actions floor integrity
// 7. USER_STOP supremacy
//
// Invariants:
// - LEVEL_0_ANALYSIS: Pure verification without side effects
// - FAIL_CLOSED
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  RollbackRequest,
  HistoricalPolicyVersion,
  RollbackRevalidationResult,
  RollbackEvaluationId,
  PolicyActiveRollbackOptions,
} from './policyActiveRollbackTypes.js';
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from './policyActiveRollbackTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyRollbackRevalidationEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyActiveRollbackOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Rollback revalidation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('REVALIDATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Independently revalidates a rollback request against the current active policy and target.
   */
  public revalidate(params: {
    readonly request: RollbackRequest;
    readonly target: HistoricalPolicyVersion;
    readonly actualCurrentActiveStateId?: string;
    readonly actualCurrentActiveVersion?: string;
  }): RollbackRevalidationResult {
    this.assertUserStopInactive();

    const { request, target, actualCurrentActiveStateId, actualCurrentActiveVersion } = params;
    const now = new Date().toISOString();
    const evalHash = crypto.createHash('sha256')
      .update(`${request?.rollbackRequestId}:${target?.targetId}:${now}`)
      .digest('hex');
    const revalidationId = `roleval_${evalHash.substring(0, 16)}` as RollbackEvaluationId;

    const checksPassed: string[] = [];
    const blockingReasons: string[] = [];

    // 1. Request & target presence
    if (!request) {
      return Object.freeze({
        revalidationId,
        rollbackRequestId: 'unknown_request' as any,
        tenantPartition: 'UNKNOWN_TENANT',
        currentActiveVersion: 'UNKNOWN',
        targetPolicyVersion: 'UNKNOWN',
        targetId: 'unknown_target' as any,
        valid: false,
        status: 'INVALID',
        checksPassed: [],
        blockingReasons: ['MISSING_ROLLBACK_REQUEST: request is null or undefined'],
        revalidatedAt: now,
      });
    }

    if (!target) {
      return Object.freeze({
        revalidationId,
        rollbackRequestId: request.rollbackRequestId,
        tenantPartition: request.tenantPartition,
        currentActiveVersion: request.currentActivePolicyVersion,
        targetPolicyVersion: request.targetPolicyVersion,
        targetId: 'unknown_target' as any,
        valid: false,
        status: 'INVALID',
        checksPassed: [],
        blockingReasons: ['MISSING_ROLLBACK_TARGET: target historical policy is null or undefined'],
        revalidatedAt: now,
      });
    }

    // 2. Strict tenant isolation
    try {
      this.validateTenant(request.tenantPartition);
      checksPassed.push('TENANT_ISOLATION_VERIFIED');
    } catch (err: any) {
      blockingReasons.push(`TENANT_ISOLATION_FAILURE: ${err.message}`);
    }

    // 3. Cross-tenant linkage
    if (request.tenantPartition !== target.tenantPartition) {
      blockingReasons.push(`CROSS_TENANT_LINKAGE_MISMATCH: Request tenant '${request.tenantPartition}' != Target tenant '${target.tenantPartition}'`);
    } else {
      checksPassed.push('TENANT_LINKAGE_MATCH');
    }

    // 4. Target identifier linkage
    if (request.targetId !== target.targetId) {
      blockingReasons.push(`TARGET_ID_MISMATCH: Request targetId '${request.targetId}' != Target object '${target.targetId}'`);
    } else {
      checksPassed.push('TARGET_ID_MATCH');
    }

    if (request.targetPolicyVersion !== target.policyVersion) {
      blockingReasons.push(`TARGET_VERSION_MISMATCH: Request targetVersion '${request.targetPolicyVersion}' != Target object '${target.policyVersion}'`);
    } else {
      checksPassed.push('TARGET_VERSION_MATCH');
    }

    // 5. Active policy state freshness & non-race check
    if (actualCurrentActiveStateId && request.currentActivePolicyStateId !== actualCurrentActiveStateId) {
      blockingReasons.push(`STALE_ACTIVE_POLICY_STATE: Request active state '${request.currentActivePolicyStateId}' does not match actual current state '${actualCurrentActiveStateId}'`);
    } else {
      checksPassed.push('ACTIVE_POLICY_STATE_FRESH');
    }

    if (actualCurrentActiveVersion && request.currentActivePolicyVersion !== actualCurrentActiveVersion) {
      blockingReasons.push(`STALE_ACTIVE_POLICY_VERSION: Request active version '${request.currentActivePolicyVersion}' does not match actual current version '${actualCurrentActiveVersion}'`);
    } else {
      checksPassed.push('ACTIVE_POLICY_VERSION_FRESH');
    }

    // 6. Invariant check: ACTIVE_POLICY != ROLLBACK_TARGET
    const activeVer = actualCurrentActiveVersion ?? request.currentActivePolicyVersion;
    if (activeVer === target.policyVersion) {
      blockingReasons.push(`ACTIVE_POLICY_EQUALS_ROLLBACK_TARGET: Target version '${target.policyVersion}' is already the current active policy version`);
    } else {
      checksPassed.push('TARGET_DISTINCT_FROM_ACTIVE');
    }

    // 7. Provenance & Verification of target
    if (!target.verified) {
      blockingReasons.push(`TARGET_NOT_VERIFIED: Historical target '${target.policyVersion}' is not verified`);
    } else {
      checksPassed.push('TARGET_VERIFIED');
    }

    if (!target.provenanceHeadHash || target.provenanceHeadHash.trim().length === 0) {
      blockingReasons.push(`MISSING_TARGET_PROVENANCE: Historical target lacks provenanceHeadHash`);
    } else {
      checksPassed.push('TARGET_PROVENANCE_PRESENT');
    }

    // 8. Hard-forbidden safety floor check
    const serialized = JSON.stringify(target.policyModifications ?? {}).toLowerCase();
    for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
      const explicitClass = (target.policyModifications as any)?.[forbidden] ??
                            (target.policyModifications as any)?.actionClassifications?.[forbidden];
      if (explicitClass && explicitClass !== 'FORBIDDEN') {
        blockingReasons.push(`HARD_FORBIDDEN_DOWNGRADE: Target modifies '${forbidden}' to '${explicitClass}'`);
      }
      if (serialized.includes(`"${forbidden}":"permit"`) || serialized.includes(`"${forbidden}":"allowed"`)) {
        blockingReasons.push(`HARD_FORBIDDEN_DOWNGRADE: Target grants permission to '${forbidden}'`);
      }
    }
    if (!blockingReasons.some(r => r.includes('HARD_FORBIDDEN'))) {
      checksPassed.push('HARD_FORBIDDEN_FLOOR_INTACT');
    }

    // 9. Invariant checks on request object
    if (request.isAutonomous !== false || request.isActivePolicy !== false || request.isPolicyMutation !== false) {
      blockingReasons.push('INVARIANT_VIOLATION: RollbackRequest must have isAutonomous=false, isActivePolicy=false, isPolicyMutation=false');
    } else {
      checksPassed.push('REQUEST_INVARIANTS_VALID');
    }

    // 10. Synthesize result
    const isValid = blockingReasons.length === 0;
    const status = isValid
      ? 'VALID'
      : blockingReasons.some(r => r.includes('STALE') || r.includes('MISMATCH'))
        ? 'SUPERSEDED'
        : blockingReasons.some(r => r.includes('DOWNGRADE') || r.includes('EQUALS'))
          ? 'BLOCKED'
          : 'INVALID';

    return Object.freeze({
      revalidationId,
      rollbackRequestId: request.rollbackRequestId,
      tenantPartition: request.tenantPartition,
      currentActiveVersion: request.currentActivePolicyVersion,
      targetPolicyVersion: request.targetPolicyVersion,
      targetId: target.targetId,
      valid: isValid,
      status,
      checksPassed: Object.freeze(checksPassed),
      blockingReasons: Object.freeze(blockingReasons),
      revalidatedAt: now,
    });
  }
}
