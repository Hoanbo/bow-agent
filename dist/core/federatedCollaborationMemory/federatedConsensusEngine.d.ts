import { ConsensusProposal, ConsensusVote, ConsensusResult, ConsensusStatus, CollaborationAuthorizationBinding, CollaborationLeaseBinding } from './federatedCollaborationMemoryTypes.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';
export interface CreateProposalParams {
    readonly proposalId: string;
    readonly contextId: string;
    readonly federationId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly proposingAgentId: string;
    readonly generation: number;
    readonly proposalType: string;
    readonly payload: Record<string, unknown>;
    readonly durationMs?: number;
}
export interface RecordVoteParams {
    readonly proposalId: string;
    readonly agentId: string;
    readonly decision: 'APPROVE' | 'REJECT' | 'ABSTAIN';
    readonly rationale: string;
    readonly confidence: number;
}
export interface ConsensusSession {
    readonly consensusId: string;
    readonly contextId: string;
    readonly federationId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly proposal: ConsensusProposal;
    readonly participatingAgentIds: readonly string[];
    readonly authorizationBinding: CollaborationAuthorizationBinding;
    readonly leaseBinding?: CollaborationLeaseBinding;
    readonly quorumThreshold: number;
    status: ConsensusStatus;
    roundsConsumed: number;
    consecutiveFailures: number;
    votes: Map<string, ConsensusVote>;
    readonly createdAt: number;
    readonly expiresAt: number;
}
export declare class FederatedConsensusEngine {
    private readonly securityBoundary;
    private readonly sessions;
    private readonly results;
    constructor(options?: {
        readonly securityBoundary?: CollaborationMemorySecurityBoundary;
    });
    /**
     * EN: Initiates a new bounded consensus session for a proposal.
     * VI: Khởi tạo một phiên đồng thuận có giới hạn mới cho một đề xuất.
     */
    createConsensusSession(consensusId: string, proposalParams: CreateProposalParams, participatingAgentIds: readonly string[], authorizationBinding: CollaborationAuthorizationBinding, leaseBinding?: CollaborationLeaseBinding, quorumThreshold?: number): ConsensusSession;
    /**
     * EN: Records a deterministic vote from an authorized participant.
     * VI: Ghi lại một lá phiếu xác định từ một tác tử tham gia được ủy quyền.
     */
    castVote(consensusId: string, voteParams: RecordVoteParams): ConsensusVote;
    /**
     * EN: Evaluates votes and computes consensus result deterministically.
     * VI: Đánh giá các lá phiếu và tính toán kết quả đồng thuận một cách xác định.
     */
    finalizeConsensus(consensusId: string): ConsensusResult;
    /**
     * EN: Retrieves an existing consensus result by ID.
     * VI: Lấy kết quả đồng thuận hiện có theo mã định danh.
     */
    getConsensusResult(consensusId: string): ConsensusResult | undefined;
    /**
     * EN: Retrieves a consensus session by ID.
     * VI: Lấy phiên đồng thuận theo mã định danh.
     */
    getSession(consensusId: string): ConsensusSession | undefined;
    /**
     * EN: Clears state.
     * VI: Xóa trạng thái.
     */
    clear(): void;
}
