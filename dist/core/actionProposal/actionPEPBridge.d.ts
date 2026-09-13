import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { GovernedPolicyEnforcementPoint } from '../policyEnforcement/governedPolicyEnforcementPoint.js';
import { type ActionProposal, type ActionProposalDecision, type PEPEnforcementResult } from './actionProposalTypes.js';
export interface ActionPEPBridgeOptions {
    readonly pep?: GovernedPolicyEnforcementPoint;
}
export declare class ActionPEPBridge {
    private readonly pep;
    constructor(options?: ActionPEPBridgeOptions);
    /**
     * Enforces runtime policy on a permitted proposal before issuing handoff.
     */
    enforceProposal(params: {
        proposal: ActionProposal;
        pdpDecision: ActionProposalDecision;
        authoritativeTask: AgentTask;
    }): Promise<PEPEnforcementResult>;
}
