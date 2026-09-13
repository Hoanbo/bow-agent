import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PhaseState, PhaseExitCandidate, PhaseExitAuthorizationRecord, PhaseExitCommitRecord, Phase14EntryReadinessRecord, Phase14EntryAuthorizationRecord, Phase14EntryCommitRecord } from './policyPhaseTransitionTypes.js';
export interface PhaseTransitionStateSnapshot {
    readonly tenantId: string;
    readonly currentPhase: PhaseState;
    readonly candidates: readonly PhaseExitCandidate[];
    readonly exitAuthorizations: readonly PhaseExitAuthorizationRecord[];
    readonly exitCommit?: PhaseExitCommitRecord;
    readonly entryReadiness?: Phase14EntryReadinessRecord;
    readonly entryAuthorizations: readonly Phase14EntryAuthorizationRecord[];
    readonly entryCommit?: Phase14EntryCommitRecord;
    readonly updatedAt: string;
}
export declare class PolicyPhaseTransitionStore {
    private readonly baseDir;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    private readonly states;
    constructor(options?: {
        readonly baseDir?: string;
        readonly isUserStopActive?: () => boolean;
        readonly sanitizer?: DiagnosisSanitizer;
    });
    private assertUserStopInactive;
    private getPartitionDir;
    private loadSnapshot;
    private persistSnapshot;
    /**
     * Retrieves current phase state for tenant.
     */
    getCurrentPhase(tenantId: string): PhaseState;
    /**
     * Saves a PhaseExitCandidate.
     */
    saveCandidate(candidate: PhaseExitCandidate): void;
    /**
     * Saves a PhaseExitAuthorizationRecord.
     */
    saveExitAuthorization(authorization: PhaseExitAuthorizationRecord): void;
    /**
     * Saves a PhaseExitCommitRecord.
     */
    saveExitCommit(commit: PhaseExitCommitRecord): void;
    /**
     * Saves a Phase14EntryReadinessRecord.
     */
    saveEntryReadiness(readiness: Phase14EntryReadinessRecord): void;
    /**
     * Saves a Phase14EntryAuthorizationRecord.
     */
    saveEntryAuthorization(authorization: Phase14EntryAuthorizationRecord): void;
    /**
     * Saves a Phase14EntryCommitRecord.
     */
    saveEntryCommit(commit: Phase14EntryCommitRecord): void;
    /**
     * Returns full snapshot for inspection.
     */
    getSnapshot(tenantId: string): PhaseTransitionStateSnapshot;
}
