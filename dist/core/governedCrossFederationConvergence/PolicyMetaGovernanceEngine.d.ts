import { type PolicyMetaEvaluation, type CrossFederationStrategyProposal } from './GovernedCrossFederationTypes.js';
export interface PolicyRule {
    readonly ruleId: string;
    readonly name: string;
    readonly disallowedActionPatterns: readonly string[];
    readonly maxAllowedResourceCost: number;
}
export declare class PolicyMetaGovernanceEngine {
    private readonly rules;
    registerPolicyRule(rule: PolicyRule): void;
    evaluateStrategy(tenantId: string, sessionId: string, proposal: CrossFederationStrategyProposal, activeLeaseIds: ReadonlySet<string>): PolicyMetaEvaluation;
    clear(): void;
}
