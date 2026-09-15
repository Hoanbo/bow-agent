// src/core/governedFederatedKnowledgeState/KnowledgeMergeReconciliationEngine.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1132 — REAL
//
// EN: Governed merge and reconciliation engine comparing knowledge states, enforcing tenant/session/mission bounds,
//     resolving non-interfering entries deterministically, and escalating material contradictions to REVIEW_REQUIRED.
// VI: Động cơ hợp nhất và đối soát có quản trị so sánh các trạng thái tri thức, thực thi ranh giới tenant/phiên/nhiệm vụ,
//     xử lý các mục không xung đột một cách xác định, và chuyển các mâu thuẫn trọng yếu sang REVIEW_REQUIRED.

import {
  KnowledgeState,
  GovernedKnowledgeEntry,
  KnowledgeMergeResult,
  KnowledgeReconciliationResult,
  MAX_MERGE_OPERATIONS_PER_STATE,
  MAX_RECONCILIATIONS_PER_STATE,
  GovernedFederatedKnowledgeStateValidationError,
  GovernedFederatedKnowledgeStateTenantIsolationError,
  GovernedFederatedKnowledgeStateSessionIsolationError,
  GovernedFederatedKnowledgeStateBudgetError,
  computeKnowledgeMergeHash,
  computeKnowledgeReconciliationHash,
} from './GovernedFederatedKnowledgeStateTypes.js';
import { FederatedKnowledgeSecurityBoundary } from './FederatedKnowledgeSecurityBoundary.js';

export class KnowledgeMergeReconciliationEngine {
  private readonly securityBoundary: FederatedKnowledgeSecurityBoundary;
  private readonly mergeResults: Map<string, KnowledgeMergeResult> = new Map();
  private readonly reconciliationResults: Map<string, KnowledgeReconciliationResult> = new Map();

  constructor(options?: { readonly securityBoundary?: FederatedKnowledgeSecurityBoundary }) {
    this.securityBoundary = options?.securityBoundary ?? new FederatedKnowledgeSecurityBoundary();
  }

  /**
   * EN: Merges entries from a source state into a target state following strict governance rules.
   * VI: Hợp nhất các mục từ trạng thái nguồn vào trạng thái đích tuân thủ quy tắc quản trị nghiêm ngặt.
   */
  public mergeStates(
    mergeId: string,
    targetState: KnowledgeState,
    sourceState: KnowledgeState
  ): { updatedTargetState: KnowledgeState; mergeResult: KnowledgeMergeResult } {
    this.securityBoundary.assertStopInactive('PRE_KNOWLEDGE_MERGE', targetState.tenantId, targetState.stateId);

    // Invariant 1-5: Boundary matching
    if (targetState.tenantId !== sourceState.tenantId) {
      throw new GovernedFederatedKnowledgeStateTenantIsolationError(
        `Merge rejected: tenant mismatch '${targetState.tenantId}' != '${sourceState.tenantId}'`,
        targetState.tenantId
      );
    }
    if (targetState.sessionId !== sourceState.sessionId) {
      throw new GovernedFederatedKnowledgeStateSessionIsolationError(
        `Merge rejected: session mismatch '${targetState.sessionId}' != '${sourceState.sessionId}'`,
        targetState.tenantId
      );
    }
    if (targetState.missionId !== sourceState.missionId) {
      throw new GovernedFederatedKnowledgeStateValidationError(
        `Merge rejected: mission mismatch '${targetState.missionId}' != '${sourceState.missionId}'`
      );
    }
    if (targetState.objectiveId !== sourceState.objectiveId) {
      throw new GovernedFederatedKnowledgeStateValidationError(
        `Merge rejected: objective mismatch '${targetState.objectiveId}' != '${sourceState.objectiveId}'`
      );
    }
    if (targetState.federationId !== sourceState.federationId) {
      throw new GovernedFederatedKnowledgeStateValidationError(
        `Merge rejected: federation mismatch '${targetState.federationId}' != '${sourceState.federationId}'`
      );
    }

    // Budget limit check
    if (targetState.mergeCount >= MAX_MERGE_OPERATIONS_PER_STATE) {
      throw new GovernedFederatedKnowledgeStateBudgetError(
        `Target state reached MAX_MERGE_OPERATIONS_PER_STATE limit (${MAX_MERGE_OPERATIONS_PER_STATE})`,
        targetState.tenantId,
        targetState.stateId
      );
    }

    const mergedEntries: Record<string, GovernedKnowledgeEntry> = { ...targetState.entries };
    const mergedEntryIds: string[] = [];
    const conflictIds: string[] = [];

    for (const [kId, srcEntry] of Object.entries(sourceState.entries)) {
      const existing = mergedEntries[kId];
      if (!existing) {
        // Non-conflicting new entry: merge cleanly
        mergedEntries[kId] = srcEntry;
        mergedEntryIds.push(kId);
      } else {
        // Entry exists in both: check congruence
        if (existing.content === srcEntry.content) {
          // Identical: keep higher confidence or newer
          if (srcEntry.confidence > existing.confidence) {
            mergedEntries[kId] = srcEntry;
          }
          mergedEntryIds.push(kId);
        } else {
          // Material contradiction detected
          conflictIds.push(kId);
        }
      }
    }

    const now = Date.now();
    const hasConflict = conflictIds.length > 0;
    const mergeStatus = hasConflict ? 'CONFLICT_DETECTED' : 'SUCCESS';

    const baseResult: Omit<KnowledgeMergeResult, 'provenanceHash'> = {
      mergeId,
      tenantId: targetState.tenantId,
      sessionId: targetState.sessionId,
      targetStateId: targetState.stateId,
      sourceStateIds: [sourceState.stateId],
      mergedEntryIds,
      conflictIds,
      status: mergeStatus,
      timestamp: now,
    };

    const provenanceHash = computeKnowledgeMergeHash(baseResult);
    const mergeResult: KnowledgeMergeResult = {
      ...baseResult,
      provenanceHash,
    };

    this.mergeResults.set(mergeId, mergeResult);

    const updatedTargetState: KnowledgeState = {
      ...targetState,
      entries: mergedEntries,
      mergeCount: targetState.mergeCount + 1,
      status: hasConflict ? 'REVIEW_REQUIRED' : targetState.status,
      version: targetState.version + 1,
      updatedAt: now,
    };

    return { updatedTargetState, mergeResult };
  }

  /**
   * EN: Reconciles contradictory entries and produces a governed reconciliation record.
   * VI: Đối soát các mục mâu thuẫn và tạo ra một bản ghi đối soát có quản trị.
   */
  public reconcileContradictoryEntries(
    reconciliationId: string,
    state: KnowledgeState,
    entryA: GovernedKnowledgeEntry,
    entryB: GovernedKnowledgeEntry
  ): KnowledgeReconciliationResult {
    this.securityBoundary.assertStopInactive('PRE_RECONCILIATION', state.tenantId, state.stateId);

    if (state.reconciliationCount >= MAX_RECONCILIATIONS_PER_STATE) {
      throw new GovernedFederatedKnowledgeStateBudgetError(
        `State reached MAX_RECONCILIATIONS_PER_STATE limit (${MAX_RECONCILIATIONS_PER_STATE})`,
        state.tenantId,
        state.stateId
      );
    }

    const now = Date.now();

    // Check if one entry overwhelmingly dominates confidence (difference >= 0.4 and confidence >= 0.8)
    let resolvable = false;
    let resolutionStrategy: 'AUTOMATIC_MERGED' | 'REVIEW_REQUIRED' | 'FAIL_CLOSED' = 'REVIEW_REQUIRED';
    let resolvedContent: string | undefined = undefined;

    if (Math.abs(entryA.confidence - entryB.confidence) >= 0.4) {
      const winner = entryA.confidence > entryB.confidence ? entryA : entryB;
      if (winner.confidence >= 0.8) {
        resolvable = true;
        resolutionStrategy = 'AUTOMATIC_MERGED';
        resolvedContent = winner.content;
      }
    }

    const base: Omit<KnowledgeReconciliationResult, 'provenanceHash'> = {
      reconciliationId,
      tenantId: state.tenantId,
      sessionId: state.sessionId,
      entryIds: [entryA.knowledgeId, entryB.knowledgeId],
      category: 'KNOWLEDGE_CONFLICT',
      resolvable,
      resolutionStrategy,
      resolvedContent,
      timestamp: now,
    };

    const provenanceHash = computeKnowledgeReconciliationHash(base);
    const result: KnowledgeReconciliationResult = {
      ...base,
      provenanceHash,
    };

    this.reconciliationResults.set(reconciliationId, result);
    return result;
  }

  /**
   * EN: Retrieves merge result by ID.
   * VI: Lấy kết quả hợp nhất theo mã định danh.
   */
  public getMergeResult(mergeId: string): KnowledgeMergeResult | undefined {
    return this.mergeResults.get(mergeId);
  }

  /**
   * EN: Retrieves reconciliation result by ID.
   * VI: Lấy kết quả đối soát theo mã định danh.
   */
  public getReconciliationResult(recId: string): KnowledgeReconciliationResult | undefined {
    return this.reconciliationResults.get(recId);
  }

  /**
   * EN: Clears state.
   * VI: Xóa trạng thái.
   */
  public clear(): void {
    this.mergeResults.clear();
    this.reconciliationResults.clear();
  }
}
