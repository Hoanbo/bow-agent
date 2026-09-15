import { type CrossFederationStrategyProposal, type CrossFederationReconciliationResult } from './GovernedCrossFederationTypes.js';
export declare class CrossFederationReconciliationEngine {
    reconcileProposals(tenantId: string, sessionId: string, missionId: string, objectiveId: string, proposals: readonly CrossFederationStrategyProposal[]): CrossFederationReconciliationResult;
    private isContradictory;
    private hasActionConflict;
}
