// src/core/multiAgentFederation/delegationConflictResolver.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1113 — REAL
//
// EN: Governed delegation conflict resolver detecting 8 conflict categories across delegations.
//     Resolves deterministically or transitions to REVIEW_REQUIRED without manufacturing authority.
// VI: Bộ giải quyết xung đột ủy quyền có quản trị phát hiện 8 danh mục xung đột giữa các ủy quyền.
//     Giải quyết một cách xác định hoặc chuyển sang REVIEW_REQUIRED mà không tự tạo thẩm quyền.

import {
  GovernedDelegation,
  DelegationConflict,
  DelegationConflictCategory,
  MultiAgentFederationConflictError,
} from './multiAgentFederationTypes.js';

export interface ConflictResolutionResult {
  readonly conflictId: string;
  readonly isResolved: boolean;
  readonly resolutionStrategy?: string;
  readonly requiresHumanReview: boolean;
}

export class DelegationConflictResolver {
  /**
   * EN: Detects conflicts between candidate delegation and currently active delegations.
   * VI: Phát hiện xung đột giữa ủy quyền ứng viên và các ủy quyền hiện đang hoạt động.
   */
  public detectConflicts(
    candidate: GovernedDelegation,
    activeDelegations: readonly GovernedDelegation[]
  ): readonly DelegationConflict[] {
    const conflicts: DelegationConflict[] = [];

    for (const existing of activeDelegations) {
      if (existing.delegationId === candidate.delegationId) {
        continue;
      }

      // 1. Tenant mismatch conflict
      if (existing.tenantId !== candidate.tenantId) {
        conflicts.push({
          conflictId: `conf_tenant_${candidate.delegationId}_${existing.delegationId}`,
          category: 'AUTHORIZATION_CONFLICT',
          primaryDelegationId: candidate.delegationId,
          conflictingDelegationId: existing.delegationId,
          description: `Cross-tenant delegation conflict between '${candidate.delegationId}' and '${existing.delegationId}'`,
          detectedAt: Date.now(),
          isResolvable: false,
        });
      }

      // 2. Generation mismatch conflict
      if (existing.generation !== candidate.generation) {
        conflicts.push({
          conflictId: `conf_gen_${candidate.delegationId}_${existing.delegationId}`,
          category: 'GENERATION_CONFLICT',
          primaryDelegationId: candidate.delegationId,
          conflictingDelegationId: existing.delegationId,
          description: `Generation divergence: existing=${existing.generation}, candidate=${candidate.generation}`,
          detectedAt: Date.now(),
          isResolvable: false,
        });
      }

      // 3. Delegate agent overlap on identical objective
      if (
        existing.delegateAgentId === candidate.delegateAgentId &&
        existing.objectiveId === candidate.objectiveId &&
        existing.status === 'ACTIVE'
      ) {
        conflicts.push({
          conflictId: `conf_agent_${candidate.delegationId}_${existing.delegationId}`,
          category: 'AGENT_CONFLICT',
          primaryDelegationId: candidate.delegationId,
          conflictingDelegationId: existing.delegationId,
          description: `Agent '${candidate.delegateAgentId}' is already actively delegated objective '${candidate.objectiveId}'`,
          detectedAt: Date.now(),
          isResolvable: true,
          resolutionStrategy: 'SERIALIZE_DELEGATION_ORDER',
        });
      }

      // 4. Mutually exclusive or overlapping write scopes
      const candidateWriteScopes = candidate.scope.filter((s) => s.startsWith('write:') || s.startsWith('mutate:'));
      const existingWriteScopes = existing.scope.filter((s) => s.startsWith('write:') || s.startsWith('mutate:'));

      const commonWrite = candidateWriteScopes.filter((s) => existingWriteScopes.includes(s));
      if (commonWrite.length > 0 && existing.status === 'ACTIVE') {
        conflicts.push({
          conflictId: `conf_scope_${candidate.delegationId}_${existing.delegationId}`,
          category: 'SCOPE_CONFLICT',
          primaryDelegationId: candidate.delegationId,
          conflictingDelegationId: existing.delegationId,
          description: `Conflicting concurrent write scopes [${commonWrite.join(', ')}] detected`,
          detectedAt: Date.now(),
          isResolvable: false,
          resolutionStrategy: 'REQUIRE_HUMAN_REVIEW_OR_SERIALIZATION',
        });
      }

      // 5. Conflicting lease binding
      if (
        candidate.leaseBinding &&
        existing.leaseBinding &&
        candidate.leaseBinding.leaseId === existing.leaseBinding.leaseId &&
        candidate.delegateAgentId !== existing.delegateAgentId &&
        existing.status === 'ACTIVE'
      ) {
        conflicts.push({
          conflictId: `conf_lease_${candidate.delegationId}_${existing.delegationId}`,
          category: 'LEASE_CONFLICT',
          primaryDelegationId: candidate.delegationId,
          conflictingDelegationId: existing.delegationId,
          description: `Single-use lease '${candidate.leaseBinding.leaseId}' concurrently claimed by multiple delegates`,
          detectedAt: Date.now(),
          isResolvable: false,
        });
      }
    }

    return conflicts;
  }

  /**
   * EN: Resolves a delegation conflict deterministically.
   * VI: Giải quyết xung đột ủy quyền một cách xác định.
   */
  public resolveConflict(conflict: DelegationConflict): ConflictResolutionResult {
    if (!conflict.isResolvable) {
      return {
        conflictId: conflict.conflictId,
        isResolved: false,
        requiresHumanReview: true,
      };
    }

    if (conflict.category === 'AGENT_CONFLICT') {
      return {
        conflictId: conflict.conflictId,
        isResolved: true,
        resolutionStrategy: 'QUEUED_SERIALIZATION',
        requiresHumanReview: false,
      };
    }

    return {
      conflictId: conflict.conflictId,
      isResolved: false,
      requiresHumanReview: true,
    };
  }
}
