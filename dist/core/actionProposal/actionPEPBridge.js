// src/core/actionProposal/actionPEPBridge.ts
// BOWCON V4.0 — MS-1.4.05: ACTION PEP BRIDGE
//
// EN:
// Integrates with the authoritative GovernedPolicyEnforcementPoint (PEP)
// to verify live runtime guardrails, canary policies, and hard-forbidden safety floors.
//
// VI:
// Tích hợp với GovernedPolicyEnforcementPoint (PEP) có thẩm quyền
// để xác minh rào chắn thời gian chạy trực tiếp, chính sách canary và ngưỡng an toàn cấm tuyệt đối.
//
// Invariants:
// - PEP == ENFORCEMENT_BOUNDARY
// - ZERO_TOOL_EXECUTION
// - HARD_FORBIDDEN_POLICY > DYNAMIC_POLICY
// - USER_STOP > PEP_ENFORCEMENT
// - FAIL_CLOSED_ON_PEP_REJECTION
import { GovernedPolicyEnforcementPoint, } from '../policyEnforcement/governedPolicyEnforcementPoint.js';
import { ProposalPEPDenyError, ProposalPolicyUnavailableError, CrossTenantProposalError, } from './actionProposalTypes.js';
export class ActionPEPBridge {
    pep;
    constructor(options) {
        this.pep = options?.pep ?? new GovernedPolicyEnforcementPoint();
    }
    /**
     * Enforces runtime policy on a permitted proposal before issuing handoff.
     */
    async enforceProposal(params) {
        const { proposal, pdpDecision, authoritativeTask } = params;
        // 1. Double check tenant boundary
        if (proposal.tenantId !== authoritativeTask.tenantId) {
            throw new CrossTenantProposalError(`TENANT_MISMATCH: Proposal tenant "${proposal.tenantId}" does not match task tenant "${authoritativeTask.tenantId}".`);
        }
        // 2. Proposal MUST have been PERMITTED by PDP
        if (!pdpDecision.allowed || pdpDecision.action !== 'PERMIT') {
            throw new ProposalPEPDenyError(`PEP_ENFORCEMENT_BLOCKED: Cannot enforce proposal "${proposal.proposalId}" that was not permitted by PDP (Status: ${pdpDecision.action}).`);
        }
        // 3. Assemble EnforcementContext
        const context = {
            toolName: proposal.actionType,
            args: proposal.sanitizedArgs,
            actor: {
                userId: authoritativeTask.userId,
                role: 'agent',
                channel: 'action_proposal_bridge',
                isOwner: false,
            },
            executionToken: pdpDecision.executionToken,
            idempotencyKey: proposal.proposalId,
            correlationId: proposal.proposalId,
            tenantPartition: proposal.tenantId,
        };
        // 4. Invoke Governed PEP
        let decision;
        try {
            decision = this.pep.enforce(context);
        }
        catch (err) {
            throw new ProposalPolicyUnavailableError(`PEP_EXECUTION_FAILED: Exception during PEP enforcement: ${err.message}`, { proposalId: proposal.proposalId, error: err.message });
        }
        if (!decision || typeof decision.allowed !== 'boolean') {
            throw new ProposalPolicyUnavailableError('MALFORMED_PEP_RESPONSE: GovernedPolicyEnforcementPoint returned an invalid or empty decision envelope.');
        }
        // 5. Fail-Closed on Non-PERMIT Decision
        if (!decision.allowed) {
            throw new ProposalPEPDenyError(`PEP_ENFORCEMENT_DENIED: Action "${proposal.actionType}" was rejected by PEP. Reason: ${decision.reason}`, {
                proposalId: proposal.proposalId,
                decisionId: decision.decisionId,
                reason: decision.reason,
                failClosedReason: decision.failClosedReason,
            });
        }
        return {
            proposalId: proposal.proposalId,
            enforced: true,
            decision: 'PERMIT',
            reason: decision.reason,
            policyVersion: decision.policyVersion,
            policyChecksum: decision.policyChecksum,
            leaseId: decision.leaseId,
            enforcedAt: decision.decisionTimestamp || new Date().toISOString(),
        };
    }
}
