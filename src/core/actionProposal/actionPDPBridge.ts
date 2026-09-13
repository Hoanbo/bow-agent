// src/core/actionProposal/actionPDPBridge.ts
// BOWCON V4.0 — MS-1.4.05: ACTION PDP BRIDGE
//
// EN:
// Translates ActionProposal into PolicyEvaluationContext and delegates evaluation
// to the authoritative Phase 1.3 PolicyDecisionPoint (PDP) and ApprovalService.
//
// VI:
// Chuyển đổi ActionProposal thành PolicyEvaluationContext và ủy thác đánh giá
// cho PolicyDecisionPoint (PDP) và ApprovalService có thẩm quyền của Phase 1.3.
//
// Invariants:
// - PDP_DECISION == AUTHORIZATION_SOURCE
// - ApprovalService == AUTHORITATIVE HUMAN APPROVAL TOKEN SOURCE
// - FAIL_CLOSED_ON_POLICY_UNAVAILABLE
// - ZERO_SELF_AUTHORIZATION
// - STRICT_TENANT_ISOLATION

import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import {
  type PolicyDecision,
  type ActionClassification,
  PolicyDecisionPoint,
  globalPDP,
} from '../policyDecisionPoint.js';
import { ApprovalService, globalApprovalService } from '../approvalService.js';
import {
  type ActionProposal,
  type ActionProposalDecision,
  ProposalPolicyUnavailableError,
  ProposalDeniedError,
  ProposalApprovalRequiredError,
  CrossTenantProposalError,
} from './actionProposalTypes.js';

export interface ActionPDPBridgeOptions {
  readonly pdp?: PolicyDecisionPoint;
  readonly approvalService?: ApprovalService;
}

export class ActionPDPBridge {
  private readonly pdp: PolicyDecisionPoint;
  private readonly approvalService: ApprovalService;

  constructor(options?: ActionPDPBridgeOptions) {
    this.pdp = options?.pdp ?? globalPDP;
    this.approvalService = options?.approvalService ?? globalApprovalService;
  }

  /**
   * Evaluates an ActionProposal against authoritative PDP policies.
   */
  public async evaluateProposal(params: {
    proposal: ActionProposal;
    authoritativeTask: AgentTask;
    executionToken?: string;
    operatorId?: string;
    ttlSeconds?: number;
  }): Promise<ActionProposalDecision> {
    const { proposal, authoritativeTask, executionToken, operatorId, ttlSeconds = 300 } = params;

    // 1. Triple Tenant Check
    if (proposal.tenantId !== authoritativeTask.tenantId) {
      throw new CrossTenantProposalError(
        `TENANT_MISMATCH: Proposal tenant "${proposal.tenantId}" does not match task tenant "${authoritativeTask.tenantId}".`
      );
    }

    // 2. Map action to PDP tool name
    const toolName = proposal.actionType;

    // 3. Construct PDP Evaluation Context
    const actor = {
      userId: authoritativeTask.userId,
      role: 'agent',
      channel: 'action_proposal_bridge',
      isOwner: false,
    };

    let decision: PolicyDecision;
    try {
      decision = this.pdp.evaluate({
        toolName,
        args: proposal.sanitizedArgs as Record<string, any>,
        actor,
        executionToken,
        idempotencyKey: proposal.proposalId,
        consumeToken: true,
      });
    } catch (err: any) {
      throw new ProposalPolicyUnavailableError(
        `PDP_EVALUATION_FAILED: Error during policy evaluation: ${err.message}`,
        { proposalId: proposal.proposalId, originalError: err.message }
      );
    }

    if (!decision || typeof decision.allowed !== 'boolean') {
      throw new ProposalPolicyUnavailableError(
        'MALFORMED_PDP_RESPONSE: PolicyDecisionPoint returned an invalid or empty decision envelope.'
      );
    }

    const evaluatedAt = decision.decisionTimestamp || new Date().toISOString();

    // 4. Handle ALLOWED / PERMIT
    if (decision.allowed) {
      return {
        proposalId: proposal.proposalId,
        allowed: true,
        action: 'PERMIT',
        authoritativeRisk: decision.classification,
        requiresHumanApproval: false,
        reason: decision.reason,
        approvalId: decision.approvalId,
        policyVersion: '4.0.0',
        evaluatedAt,
        executionToken,
      };
    }

    // 5. Handle REQUIRE_HUMAN_APPROVAL / HIGH_IMPACT without valid token
    if (decision.requiresApproval || decision.classification === 'HIGH_IMPACT') {
      let approvalId = decision.approvalId;

      // If PDP didn't create an approval request, create one authoritatively via ApprovalService
      if (!approvalId) {
        try {
          const record = this.approvalService.requestApproval({
            actionName: toolName,
            targetDomain: 'dynamic_code',
            arguments: proposal.sanitizedArgs as Record<string, any>,
            requestedBy: authoritativeTask.userId,
            userId: authoritativeTask.userId,
            ttlSeconds,
            correlationId: proposal.proposalId,
          });
          approvalId = record.id;
        } catch (err: any) {
          throw new ProposalPolicyUnavailableError(
            `APPROVAL_SERVICE_ERROR: Failed to register approval request: ${err.message}`
          );
        }
      }

      return {
        proposalId: proposal.proposalId,
        allowed: false,
        action: 'REQUIRE_HUMAN_APPROVAL',
        authoritativeRisk: decision.classification,
        requiresHumanApproval: true,
        reason: decision.reason,
        approvalId,
        policyVersion: '4.0.0',
        evaluatedAt,
      };
    }

    // 6. Handle Strict Policy Rejection / FORBIDDEN / Kill Switch
    return {
      proposalId: proposal.proposalId,
      allowed: false,
      action: 'DENY',
      authoritativeRisk: decision.classification,
      requiresHumanApproval: false,
      reason: decision.reason,
      policyVersion: '4.0.0',
      evaluatedAt,
    };
  }
}
