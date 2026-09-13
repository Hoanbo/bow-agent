import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { PolicyDecisionPoint } from '../policyDecisionPoint.js';
import { ApprovalService } from '../approvalService.js';
import { type ActionProposal, type ActionProposalDecision } from './actionProposalTypes.js';
export interface ActionPDPBridgeOptions {
    readonly pdp?: PolicyDecisionPoint;
    readonly approvalService?: ApprovalService;
}
export declare class ActionPDPBridge {
    private readonly pdp;
    private readonly approvalService;
    constructor(options?: ActionPDPBridgeOptions);
    /**
     * Evaluates an ActionProposal against authoritative PDP policies.
     */
    evaluateProposal(params: {
        proposal: ActionProposal;
        authoritativeTask: AgentTask;
        executionToken?: string;
        operatorId?: string;
        ttlSeconds?: number;
    }): Promise<ActionProposalDecision>;
}
