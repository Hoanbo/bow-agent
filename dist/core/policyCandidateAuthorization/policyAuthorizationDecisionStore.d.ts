import type { HumanAuthorizationDecision, ActivationReadinessDecision, PolicyCandidateAuthorizationOptions } from './policyCandidateAuthorizationTypes.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface ListDecisionsOptions {
    readonly page?: number;
    readonly pageSize?: number;
}
export interface ListDecisionsResult {
    readonly decisions: readonly HumanAuthorizationDecision[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
}
export declare class PolicyAuthorizationDecisionStore {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly sanitizer;
    private readonly tenantDecisions;
    private readonly candidateDecisionLookup;
    private readonly tenantReadiness;
    private readonly candidateReadinessLookup;
    constructor(options?: PolicyCandidateAuthorizationOptions, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    private getTenantStorageDir;
    private loadTenantStateIfEmpty;
    private persistTenantState;
    /**
     * Saves a human authorization decision.
     * Guarantees duplicate-idempotency and conflicting modification rejection.
     */
    saveDecision(decision: HumanAuthorizationDecision): HumanAuthorizationDecision;
    /**
     * Saves an activation readiness decision.
     */
    saveReadiness(readiness: ActivationReadinessDecision): ActivationReadinessDecision;
    /**
     * Retrieves an authorization decision by candidateDraftId.
     */
    getDecisionByCandidate(tenantPartition: string, candidateDraftId: string): HumanAuthorizationDecision | null;
    /**
     * Retrieves an activation readiness decision by candidateDraftId.
     */
    getReadinessByCandidate(tenantPartition: string, candidateDraftId: string): ActivationReadinessDecision | null;
    /**
     * Lists decisions with bounded pagination.
     */
    listDecisions(tenantPartition: string, options?: ListDecisionsOptions): ListDecisionsResult;
}
