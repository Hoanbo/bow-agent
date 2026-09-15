import { ConsensusConflictCategory, ConsensusProposal, ConsensusVote, AgentObservation, CollaborationMemoryEntry } from './federatedCollaborationMemoryTypes.js';
export interface ConflictResolutionResult {
    readonly conflictId: string;
    readonly category: ConsensusConflictCategory;
    readonly resolvable: boolean;
    readonly resolutionStrategy: 'AUTOMATIC_RECONCILED' | 'REVIEW_REQUIRED' | 'FAIL_CLOSED';
    readonly explanation: string;
    readonly resolvedValue?: unknown;
    readonly provenanceHash: string;
}
export declare class ConsensusConflictResolver {
    /**
     * EN: Evaluates votes on a proposal and detects conflicts.
     * VI: Đánh giá các lá phiếu cho một đề xuất và phát hiện xung đột.
     */
    resolveVoteConflict(proposal: ConsensusProposal, votes: readonly ConsensusVote[]): ConflictResolutionResult;
    /**
     * EN: Resolves contradictions across observations.
     * VI: Xử lý mâu thuẫn giữa các quan sát.
     */
    resolveObservationConflict(target: string, observations: readonly AgentObservation[]): ConflictResolutionResult;
    /**
     * EN: Detects and classifies explicit conflict types between memory entries.
     * VI: Phát hiện và phân loại các loại xung đột rõ ràng giữa các mục bộ nhớ.
     */
    detectMemoryConflict(entryA: CollaborationMemoryEntry, entryB: CollaborationMemoryEntry): ConsensusConflictCategory | undefined;
}
