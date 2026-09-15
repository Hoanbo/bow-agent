import { type CrossFederationConflictCategory, type CrossFederationConflictRecord } from './GovernedCrossFederationTypes.js';
export interface ResolveConflictParams {
    readonly conflictId: string;
    readonly category: CrossFederationConflictCategory;
    readonly participatingFederationIds: readonly string[];
    readonly description: string;
    readonly humanDirectiveProposalId?: string;
    readonly winningProposalId?: string;
    readonly isPrivilegeEscalationAttempt?: boolean;
}
export declare class CrossFederationConflictResolver {
    private readonly resolvedConflicts;
    resolveConflict(params: ResolveConflictParams): CrossFederationConflictRecord;
    getConflict(conflictId: string): CrossFederationConflictRecord | undefined;
    getAllConflicts(): readonly CrossFederationConflictRecord[];
    clear(): void;
}
