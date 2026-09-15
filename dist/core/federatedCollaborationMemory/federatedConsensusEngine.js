// src/core/federatedCollaborationMemory/federatedConsensusEngine.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1123 — REAL
//
// EN: Governed federated consensus engine coordinating bounded, deterministic voting and agreement
//     over already-authorized collaboration data without independent execution authority.
// VI: Động cơ đồng thuận liên đoàn có quản trị điều phối bỏ phiếu và đồng thuận có giới hạn,
//     xác định trên dữ liệu hợp tác đã được ủy quyền mà không có thẩm quyền thực thi độc lập.
import { MAX_CONSENSUS_PARTICIPANTS, MAX_ACTIVE_CONSENSUS_SESSIONS, MAX_CONSENSUS_ROUNDS, MAX_CONSENSUS_DURATION_MS, FederatedCollaborationMemoryValidationError, FederatedCollaborationMemoryBudgetError, FederatedCollaborationMemoryAuthorizationError, computeConsensusProposalHash, computeConsensusResultHash, computeSha256, } from './federatedCollaborationMemoryTypes.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';
export class FederatedConsensusEngine {
    securityBoundary;
    sessions = new Map();
    results = new Map();
    constructor(options) {
        this.securityBoundary = options?.securityBoundary ?? new CollaborationMemorySecurityBoundary();
    }
    /**
     * EN: Initiates a new bounded consensus session for a proposal.
     * VI: Khởi tạo một phiên đồng thuận có giới hạn mới cho một đề xuất.
     */
    createConsensusSession(consensusId, proposalParams, participatingAgentIds, authorizationBinding, leaseBinding, quorumThreshold = 0.5) {
        // 1. Checkpoint: PRE_CONSENSUS_CREATION
        this.securityBoundary.assertStopInactive('PRE_CONSENSUS_CREATION', proposalParams.tenantId, proposalParams.federationId);
        // 2. Active session limit check
        const activeSessions = Array.from(this.sessions.values()).filter((s) => s.sessionId === proposalParams.sessionId &&
            s.status !== 'COMPLETED' &&
            s.status !== 'FAILED' &&
            s.status !== 'CONSENSUS_REACHED' &&
            s.status !== 'CONSENSUS_REJECTED');
        if (activeSessions.length >= MAX_ACTIVE_CONSENSUS_SESSIONS) {
            throw new FederatedCollaborationMemoryBudgetError(`Session reached MAX_ACTIVE_CONSENSUS_SESSIONS limit (${MAX_ACTIVE_CONSENSUS_SESSIONS})`, proposalParams.tenantId, proposalParams.contextId);
        }
        // 3. Participant bounds
        if (participatingAgentIds.length === 0 || participatingAgentIds.length > MAX_CONSENSUS_PARTICIPANTS) {
            throw new FederatedCollaborationMemoryBudgetError(`Participant count must be between 1 and ${MAX_CONSENSUS_PARTICIPANTS}`, proposalParams.tenantId, proposalParams.contextId);
        }
        // 4. Validate proposing agent is participant
        if (!participatingAgentIds.includes(proposalParams.proposingAgentId)) {
            throw new FederatedCollaborationMemoryValidationError(`Proposing agent '${proposalParams.proposingAgentId}' is not among authorized participants`);
        }
        // 5. Validate authorization binding & expiry
        if (!authorizationBinding || authorizationBinding.expiresAt <= Date.now()) {
            throw new FederatedCollaborationMemoryAuthorizationError('Authorization binding is missing or expired');
        }
        if (leaseBinding && leaseBinding.expiresAt <= Date.now()) {
            throw new FederatedCollaborationMemoryValidationError('Governing lease is expired');
        }
        const now = Date.now();
        const duration = Math.min(proposalParams.durationMs ?? 300_000, MAX_CONSENSUS_DURATION_MS);
        const expiresAt = Math.min(now + duration, authorizationBinding.expiresAt);
        const propBase = {
            proposalId: proposalParams.proposalId,
            contextId: proposalParams.contextId,
            federationId: proposalParams.federationId,
            tenantId: proposalParams.tenantId,
            sessionId: proposalParams.sessionId,
            proposingAgentId: proposalParams.proposingAgentId,
            generation: proposalParams.generation,
            proposalType: proposalParams.proposalType,
            payload: proposalParams.payload,
            createdAt: now,
            expiresAt,
            status: 'PENDING',
        };
        const proposalProvenance = computeConsensusProposalHash(propBase);
        const proposal = {
            ...propBase,
            provenanceHash: proposalProvenance,
        };
        const session = {
            consensusId,
            contextId: proposalParams.contextId,
            federationId: proposalParams.federationId,
            tenantId: proposalParams.tenantId,
            sessionId: proposalParams.sessionId,
            proposal,
            participatingAgentIds: [...participatingAgentIds],
            authorizationBinding,
            leaseBinding,
            quorumThreshold,
            status: 'READY',
            roundsConsumed: 0,
            consecutiveFailures: 0,
            votes: new Map(),
            createdAt: now,
            expiresAt,
        };
        this.sessions.set(consensusId, session);
        return session;
    }
    /**
     * EN: Records a deterministic vote from an authorized participant.
     * VI: Ghi lại một lá phiếu xác định từ một tác tử tham gia được ủy quyền.
     */
    castVote(consensusId, voteParams) {
        const session = this.sessions.get(consensusId);
        if (!session) {
            throw new FederatedCollaborationMemoryValidationError(`Consensus session '${consensusId}' not found`);
        }
        this.securityBoundary.assertStopInactive('PRE_CONSENSUS_ROUND', session.tenantId, session.federationId);
        // Validate active status
        if (session.status !== 'READY' && session.status !== 'VOTING' && session.status !== 'PROPOSING') {
            throw new FederatedCollaborationMemoryValidationError(`Cannot cast vote in session status '${session.status}'`);
        }
        // Expiry check
        if (session.expiresAt <= Date.now()) {
            session.status = 'FAILED';
            throw new FederatedCollaborationMemoryValidationError('Consensus session has expired');
        }
        // Participant check
        if (!session.participatingAgentIds.includes(voteParams.agentId)) {
            throw new FederatedCollaborationMemoryValidationError(`Agent '${voteParams.agentId}' is not an authorized participant in consensus '${consensusId}'`);
        }
        // Clean rationale of deliberation
        if (voteParams.rationale.includes('<thought>') || voteParams.rationale.includes('[scratchpad]')) {
            throw new FederatedCollaborationMemoryValidationError('CoT or deliberation marker detected in vote rationale');
        }
        const now = Date.now();
        const signatureHash = computeSha256(`vote:${session.consensusId}:${voteParams.agentId}:${voteParams.decision}:${now}`);
        const vote = {
            voteId: `vote_${session.consensusId}_${voteParams.agentId}`,
            proposalId: session.proposal.proposalId,
            agentId: voteParams.agentId,
            decision: voteParams.decision,
            rationale: voteParams.rationale,
            confidence: Math.max(0, Math.min(1, voteParams.confidence)),
            timestamp: now,
            signatureHash,
        };
        session.votes.set(vote.agentId, vote);
        session.status = 'VOTING';
        return vote;
    }
    /**
     * EN: Evaluates votes and computes consensus result deterministically.
     * VI: Đánh giá các lá phiếu và tính toán kết quả đồng thuận một cách xác định.
     */
    finalizeConsensus(consensusId) {
        const session = this.sessions.get(consensusId);
        if (!session) {
            throw new FederatedCollaborationMemoryValidationError(`Consensus session '${consensusId}' not found`);
        }
        this.securityBoundary.assertStopInactive('PRE_CONSENSUS_RESULT', session.tenantId, session.federationId);
        // Bounded rounds progression
        if (session.roundsConsumed >= MAX_CONSENSUS_ROUNDS) {
            session.status = 'FAILED';
            throw new FederatedCollaborationMemoryBudgetError(`Consensus exceeded MAX_CONSENSUS_ROUNDS (${MAX_CONSENSUS_ROUNDS})`, session.tenantId, session.contextId);
        }
        session.roundsConsumed++;
        const votesList = Array.from(session.votes.values());
        const totalParticipants = session.participatingAgentIds.length;
        const approveCount = votesList.filter((v) => v.decision === 'APPROVE').length;
        const rejectCount = votesList.filter((v) => v.decision === 'REJECT').length;
        const dissenting = votesList.filter((v) => v.decision === 'REJECT').map((v) => v.agentId);
        const quorumRatio = votesList.length / totalParticipants;
        const approvalRatio = totalParticipants > 0 ? approveCount / totalParticipants : 0;
        let finalStatus;
        if (quorumRatio < session.quorumThreshold) {
            finalStatus = 'REVIEW_REQUIRED';
        }
        else if (approvalRatio >= session.quorumThreshold && rejectCount === 0) {
            finalStatus = 'CONSENSUS_REACHED';
        }
        else if (approvalRatio >= session.quorumThreshold && rejectCount > 0) {
            // Dissenting votes exist: check if supermajority overcomes or requires review
            finalStatus = rejectCount >= approveCount ? 'CONSENSUS_REJECTED' : 'CONSENSUS_REACHED';
        }
        else {
            finalStatus = 'CONSENSUS_REJECTED';
        }
        const avgConfidence = votesList.length > 0
            ? votesList.reduce((acc, v) => acc + v.confidence, 0) / votesList.length
            : 0;
        const resBase = {
            consensusId: session.consensusId,
            federationId: session.federationId,
            contextId: session.contextId,
            proposalId: session.proposal.proposalId,
            status: finalStatus,
            votes: votesList,
            quorum: quorumRatio,
            confidence: avgConfidence,
            dissentingAgents: dissenting,
            generation: session.proposal.generation,
            authorizationBinding: session.authorizationBinding,
            leaseBinding: session.leaseBinding,
            roundsConsumed: session.roundsConsumed,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
        };
        const provenanceHash = computeConsensusResultHash(resBase);
        const result = {
            ...resBase,
            provenanceHash,
        };
        session.status = finalStatus;
        this.results.set(consensusId, result);
        return result;
    }
    /**
     * EN: Retrieves an existing consensus result by ID.
     * VI: Lấy kết quả đồng thuận hiện có theo mã định danh.
     */
    getConsensusResult(consensusId) {
        return this.results.get(consensusId);
    }
    /**
     * EN: Retrieves a consensus session by ID.
     * VI: Lấy phiên đồng thuận theo mã định danh.
     */
    getSession(consensusId) {
        return this.sessions.get(consensusId);
    }
    /**
     * EN: Clears state.
     * VI: Xóa trạng thái.
     */
    clear() {
        this.sessions.clear();
        this.results.clear();
    }
}
