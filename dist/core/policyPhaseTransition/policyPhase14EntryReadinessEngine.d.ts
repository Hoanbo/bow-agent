import { type PhaseExitCommitRecord, type Phase14EntryReadinessRecord } from './policyPhaseTransitionTypes.js';
export interface Phase14ReadinessEvaluationParams {
    readonly exitCommit: PhaseExitCommitRecord;
    readonly tenantId: string;
}
export declare const CANONICAL_PHASE_1_4_PREREQUISITES: readonly string[];
export declare class PolicyPhase14EntryReadinessEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Evaluates readiness for entering Phase 1.4.
     */
    evaluateEntryReadiness(params: Phase14ReadinessEvaluationParams): Phase14EntryReadinessRecord;
}
