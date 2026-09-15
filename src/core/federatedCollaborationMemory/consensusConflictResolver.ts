// src/core/federatedCollaborationMemory/consensusConflictResolver.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1124 — REAL
//
// EN: Governed consensus conflict resolver detecting, categorizing, and resolving multi-agent conflicts
//     across 8 canonical categories without manufacturing authority or suppressing evidence.
// VI: Bộ giải quyết xung đột đồng thuận có quản trị phát hiện, phân loại và xử lý xung đột đa tác tử
//     trên 8 danh mục chuẩn mà không tự tạo thẩm quyền hay che giấu bằng chứng.

import {
  ConsensusConflictCategory,
  ConsensusProposal,
  ConsensusVote,
  AgentObservation,
  CollaborationMemoryEntry,
  FederatedCollaborationMemoryConflictError,
  computeSha256,
  deterministicJsonStringify,
} from './federatedCollaborationMemoryTypes.js';

export interface ConflictResolutionResult {
  readonly conflictId: string;
  readonly category: ConsensusConflictCategory;
  readonly resolvable: boolean;
  readonly resolutionStrategy: 'AUTOMATIC_RECONCILED' | 'REVIEW_REQUIRED' | 'FAIL_CLOSED';
  readonly explanation: string;
  readonly resolvedValue?: unknown;
  readonly provenanceHash: string;
}

export class ConsensusConflictResolver {
  /**
   * EN: Evaluates votes on a proposal and detects conflicts.
   * VI: Đánh giá các lá phiếu cho một đề xuất và phát hiện xung đột.
   */
  public resolveVoteConflict(
    proposal: ConsensusProposal,
    votes: readonly ConsensusVote[]
  ): ConflictResolutionResult {
    const totalVotes = votes.length;
    const approveVotes = votes.filter((v) => v.decision === 'APPROVE');
    const rejectVotes = votes.filter((v) => v.decision === 'REJECT');

    const conflictId = `conflict_vote_${proposal.proposalId}_${Date.now()}`;

    // 1. If unanimous approval or no rejects, no conflict
    if (rejectVotes.length === 0 && approveVotes.length > 0) {
      const base = {
        conflictId,
        category: 'POLICY_CONFLICT' as ConsensusConflictCategory,
        resolvable: true,
        resolutionStrategy: 'AUTOMATIC_RECONCILED' as const,
        explanation: 'Unanimous or uncontested votes accepted',
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // 2. If tie, escalate to REVIEW_REQUIRED
    if (approveVotes.length === rejectVotes.length && totalVotes > 1) {
      const base = {
        conflictId,
        category: 'AGENT_CONFLICT' as ConsensusConflictCategory,
        resolvable: false,
        resolutionStrategy: 'REVIEW_REQUIRED' as const,
        explanation: `Contested vote: tie between ${approveVotes.length} APPROVE vs ${rejectVotes.length} REJECT requires human governance review`,
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // 3. Reject dominates
    if (rejectVotes.length > approveVotes.length) {
      const base = {
        conflictId,
        category: 'AGENT_CONFLICT' as ConsensusConflictCategory,
        resolvable: true,
        resolutionStrategy: 'AUTOMATIC_RECONCILED' as const,
        explanation: 'Rejection consensus reached deterministically',
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // 4. Approve dominates with dissenting minority
    const base = {
      conflictId,
      category: 'AGENT_CONFLICT' as ConsensusConflictCategory,
      resolvable: true,
      resolutionStrategy: 'AUTOMATIC_RECONCILED' as const,
      explanation: `Majority approval (${approveVotes.length}/${totalVotes}) accepted with recorded dissent`,
    };
    return {
      ...base,
      provenanceHash: computeSha256(deterministicJsonStringify(base)),
    };
  }

  /**
   * EN: Resolves contradictions across observations.
   * VI: Xử lý mâu thuẫn giữa các quan sát.
   */
  public resolveObservationConflict(
    target: string,
    observations: readonly AgentObservation[]
  ): ConflictResolutionResult {
    const conflictId = `conflict_obs_${computeSha256(target).slice(0, 12)}_${Date.now()}`;
    const values = Array.from(new Set(observations.map((o) => o.observedValue)));

    if (values.length <= 1) {
      const base = {
        conflictId,
        category: 'OBSERVATION_CONFLICT' as ConsensusConflictCategory,
        resolvable: true,
        resolutionStrategy: 'AUTOMATIC_RECONCILED' as const,
        explanation: 'All observations are consistent',
        resolvedValue: values[0],
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // Contradictory values observed
    // If one observation has overwhelming confidence difference (> 0.4 difference)
    const sorted = [...observations].sort((a, b) => b.confidence - a.confidence);
    if (sorted[0].confidence - sorted[1].confidence >= 0.4 && sorted[0].confidence >= 0.8) {
      const base = {
        conflictId,
        category: 'OBSERVATION_CONFLICT' as ConsensusConflictCategory,
        resolvable: true,
        resolutionStrategy: 'AUTOMATIC_RECONCILED' as const,
        explanation: `Dominant high-confidence observation (${sorted[0].confidence} vs ${sorted[1].confidence}) reconciled`,
        resolvedValue: sorted[0].observedValue,
      };
      return {
        ...base,
        provenanceHash: computeSha256(deterministicJsonStringify(base)),
      };
    }

    // Ambiguous contradiction requires human review
    const base = {
      conflictId,
      category: 'OBSERVATION_CONFLICT' as ConsensusConflictCategory,
      resolvable: false,
      resolutionStrategy: 'REVIEW_REQUIRED' as const,
      explanation: `Contradictory observations for '${target}' with comparable confidence scores require human review`,
    };
    return {
      ...base,
      provenanceHash: computeSha256(deterministicJsonStringify(base)),
    };
  }

  /**
   * EN: Detects and classifies explicit conflict types between memory entries.
   * VI: Phát hiện và phân loại các loại xung đột rõ ràng giữa các mục bộ nhớ.
   */
  public detectMemoryConflict(
    entryA: CollaborationMemoryEntry,
    entryB: CollaborationMemoryEntry
  ): ConsensusConflictCategory | undefined {
    if (entryA.memoryId === entryB.memoryId) return undefined;
    if (entryA.tenantId !== entryB.tenantId) return 'AUTHORIZATION_CONFLICT';
    if (entryA.sessionId !== entryB.sessionId) return 'AUTHORIZATION_CONFLICT';
    if (entryA.generation !== entryB.generation) return 'GENERATION_CONFLICT';
    if (entryA.memoryType === entryB.memoryType && entryA.content !== entryB.content) {
      return 'MEMORY_CONFLICT';
    }
    return undefined;
  }
}
