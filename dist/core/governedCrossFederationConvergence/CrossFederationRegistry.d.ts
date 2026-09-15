import { type CrossFederationStrategyProposal } from './GovernedCrossFederationTypes.js';
export interface ParticipatingFederationRecord {
    readonly federationId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly agentIds: readonly string[];
    readonly authorizationEnvelopeId: string;
    readonly leaseId: string;
    readonly registeredAt: number;
}
export interface RegisterFederationParams {
    readonly federationId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly agentIds: readonly string[];
    readonly authorizationEnvelopeId: string;
    readonly leaseId: string;
}
export interface RegisterProposalParams {
    readonly proposalId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly federationId: string;
    readonly authorAgentId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly strategicGoal: string;
    readonly plannedActions: readonly string[];
    readonly dependencies?: readonly any[];
    readonly estimatedResourceCost: number;
    readonly priority: number;
    readonly generation: number;
    readonly authorizationEnvelopeId: string;
    readonly leaseId: string;
}
export declare class CrossFederationRegistry {
    private readonly federations;
    private readonly proposals;
    private readonly quarantinedPayloads;
    private sanitizeKeys;
    private assertZeroCoT;
    sanitizeContent(text: string): {
        sanitized: string;
        quarantined: boolean;
        reason?: string;
    };
    registerFederation(params: RegisterFederationParams): ParticipatingFederationRecord;
    registerProposal(params: RegisterProposalParams): CrossFederationStrategyProposal;
    getFederation(federationId: string): ParticipatingFederationRecord | undefined;
    getAllFederations(): readonly ParticipatingFederationRecord[];
    getProposal(proposalId: string): CrossFederationStrategyProposal | undefined;
    getAllProposals(): readonly CrossFederationStrategyProposal[];
    getQuarantinedPayloads(): readonly {
        id: string;
        reason: string;
        timestamp: number;
    }[];
    clear(): void;
}
