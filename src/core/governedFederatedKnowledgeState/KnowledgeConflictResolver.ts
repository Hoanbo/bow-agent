// src/core/governedFederatedKnowledgeState/KnowledgeConflictResolver.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1133 — REAL
//
// EN: Governed conflict resolver detecting, categorizing, and resolving conflicts across 8 canonical categories
//     without manufacturing authority or silently overwriting authoritative discrepancies.
// VI: Bộ giải quyết xung đột có quản trị phát hiện, phân loại và xử lý xung đột trên 8 danh mục chuẩn
//     mà không tự tạo thẩm quyền hay ghi đè ngầm các sai lệch có thẩm quyền.

import {
  KnowledgeConflictCategory,
  GovernedKnowledgeEntry,
  KnowledgeState,
  computeSha256,
  deterministicJsonStringify,
} from './GovernedFederatedKnowledgeStateTypes.js';

export interface KnowledgeConflictResolution {
  readonly conflictId: string;
  readonly category: KnowledgeConflictCategory;
  readonly resolvable: boolean;
  readonly strategy: 'AUTOMATIC_RECONCILED' | 'REVIEW_REQUIRED' | 'FAIL_CLOSED';
  readonly explanation: string;
  readonly resolvedContent?: string;
  readonly provenanceHash: string;
}

export class KnowledgeConflictResolver {
  /**
   * EN: Detects and classifies conflicts between two knowledge entries.
   * VI: Phát hiện và phân loại xung đột giữa hai mục tri thức.
   */
  public detectConflict(
    entryA: GovernedKnowledgeEntry,
    entryB: GovernedKnowledgeEntry
  ): KnowledgeConflictCategory | undefined {
    if (entryA.knowledgeId === entryB.knowledgeId && entryA.version === entryB.version && entryA.content === entryB.content) {
      return undefined;
    }

    if (entryA.tenantId !== entryB.tenantId) return 'AUTHORIZATION_CONFLICT';
    if (entryA.sessionId !== entryB.sessionId) return 'AUTHORIZATION_CONFLICT';
    if (entryA.missionId !== entryB.missionId || entryA.objectiveId !== entryB.objectiveId) return 'POLICY_CONFLICT';
    if (entryA.leaseId !== entryB.leaseId && entryA.leaseId && entryB.leaseId) return 'LEASE_CONFLICT';
    if (entryA.generation !== entryB.generation) return 'GENERATION_CONFLICT';
    if (entryA.sourceAgentId !== entryB.sourceAgentId && entryA.knowledgeType === entryB.knowledgeType && entryA.content !== entryB.content) {
      return 'AGENT_CONFLICT';
    }
    if (entryA.knowledgeId === entryB.knowledgeId && entryA.version !== entryB.version) {
      return 'VERSION_CONFLICT';
    }
    if (entryA.lineageId !== entryB.lineageId && entryA.content !== entryB.content) {
      return 'LINEAGE_CONFLICT';
    }
    if (entryA.content !== entryB.content) {
      return 'KNOWLEDGE_CONFLICT';
    }

    return undefined;
  }

  /**
   * EN: Resolves a detected conflict between two knowledge entries without manufacturing authority.
   * VI: Xử lý một xung đột đã phát hiện giữa hai mục tri thức mà không tự tạo thẩm quyền.
   */
  public resolveConflict(
    entryA: GovernedKnowledgeEntry,
    entryB: GovernedKnowledgeEntry,
    category: KnowledgeConflictCategory
  ): KnowledgeConflictResolution {
    const conflictId = `conflict_k_${computeSha256(entryA.knowledgeId + entryB.knowledgeId).slice(0, 12)}_${Date.now()}`;

    // 1. Authorization, Lease, or Generation conflicts are non-resolvable: must fail closed or escalate
    if (category === 'AUTHORIZATION_CONFLICT' || category === 'LEASE_CONFLICT' || category === 'POLICY_CONFLICT') {
      const base = {
        conflictId,
        category,
        resolvable: false,
        strategy: 'REVIEW_REQUIRED' as const,
        explanation: `Critical ${category} between entries requires human authority or policy decision`,
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // 2. Generation conflict
    if (category === 'GENERATION_CONFLICT') {
      const base = {
        conflictId,
        category,
        resolvable: false,
        strategy: 'REVIEW_REQUIRED' as const,
        explanation: `Generation divergence (${entryA.generation} vs ${entryB.generation}) cannot be merged automatically`,
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // 3. Knowledge / Agent contradiction: check confidence dominance
    if (category === 'KNOWLEDGE_CONFLICT' || category === 'AGENT_CONFLICT') {
      if (Math.abs(entryA.confidence - entryB.confidence) >= 0.4) {
        const dominant = entryA.confidence > entryB.confidence ? entryA : entryB;
        if (dominant.confidence >= 0.8) {
          const base = {
            conflictId,
            category,
            resolvable: true,
            strategy: 'AUTOMATIC_RECONCILED' as const,
            explanation: `Dominant confidence (${dominant.confidence} vs ${Math.min(entryA.confidence, entryB.confidence)}) reconciled`,
            resolvedContent: dominant.content,
          };
          return {
            ...base,
            provenanceHash: computeSha256(deterministicJsonStringify(base)),
          };
        }
      }

      // Close confidence contradiction requires review
      const base = {
        conflictId,
        category,
        resolvable: false,
        strategy: 'REVIEW_REQUIRED' as const,
        explanation: `Material contradiction between entries with comparable confidence requires human review`,
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // 4. Version conflict: newer version dominates if linear progression
    if (category === 'VERSION_CONFLICT') {
      const newer = entryA.version > entryB.version ? entryA : entryB;
      const base = {
        conflictId,
        category,
        resolvable: true,
        strategy: 'AUTOMATIC_RECONCILED' as const,
        explanation: `Linear version progression resolved to version ${newer.version}`,
        resolvedContent: newer.content,
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // Fallback: fail closed to REVIEW_REQUIRED
    const base = {
      conflictId,
      category,
      resolvable: false,
      strategy: 'REVIEW_REQUIRED' as const,
      explanation: `Unhandled conflict category '${category}' escalated to human review`,
    };
    return {
      ...base,
      provenanceHash: computeSha256(deterministicJsonStringify(base)),
    };
  }
}
