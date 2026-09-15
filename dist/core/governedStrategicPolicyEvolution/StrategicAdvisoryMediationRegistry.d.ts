import { PolicyEvolutionProposal, AdvisoryMediationRecord, PolicyDomain, PolicyDelta } from './GovernedStrategicPolicyEvolutionTypes.js';
export interface RawAdvisoryRecommendationInput {
    tenantId: string;
    sessionId: string;
    missionId: string;
    sourceRecommendationId: string;
    sourceStrategicMemoryRecordIds: string[];
    policyDomain: PolicyDomain;
    proposedChanges: PolicyDelta[];
    justification: string;
    advisoryOnly?: boolean;
}
export declare class StrategicAdvisoryMediationRegistry {
    private proposalsByTenant;
    private mediationRecordsByTenant;
    private secretRegexes;
    private reasoningRegexes;
    private injectionRegexes;
    constructor();
    private assertPrototypeSafety;
    sanitizeText(text: string): {
        sanitized: string;
        scrubbed: boolean;
    };
    ingestAndAdmit(input: RawAdvisoryRecommendationInput): {
        proposal: PolicyEvolutionProposal;
        mediationRecord: AdvisoryMediationRecord;
    };
    getProposal(tenantId: string, proposalId: string): PolicyEvolutionProposal | undefined;
    listProposals(tenantId: string): PolicyEvolutionProposal[];
    getMediationRecord(tenantId: string, mediationId: string): AdvisoryMediationRecord | undefined;
    private getOrCreateTenantMap;
    private getOrCreateMediationMap;
    clearTenant(tenantId: string): void;
}
