import type { DurableResilienceStateRecord, ResilienceHealthState, ResilienceFailureRecord, ResilienceRecoveryProposal, ResilienceRecoveryAttempt, ResilienceVerificationResult } from './cognitiveResilienceTypes.js';
export declare function computeResilienceStateHash(state: Omit<DurableResilienceStateRecord, 'integrityHash' | 'stateStatus'>): string;
export declare class DurableResilienceStateStore {
    private readonly _storageDir;
    private readonly _filePath;
    private readonly _sessionId;
    private readonly _ownerId;
    constructor(options?: {
        storageDir?: string;
        sessionId?: string;
        ownerId?: string;
    });
    getFilePath(): string;
    getSessionId(): string;
    /**
     * Persists the minimal necessary resilience state to disk.
     * Strips any sensitive tokens and computes cryptographic integrity hash.
     */
    saveState(params: {
        healthState: ResilienceHealthState;
        failures: ResilienceFailureRecord[];
        activeProposals: ResilienceRecoveryProposal[];
        attempts: Record<string, ResilienceRecoveryAttempt[]>;
        verifications: Record<string, ResilienceVerificationResult>;
        resolvedFailureIds: string[];
        recoveryCounters: {
            totalFailures: number;
            totalRecoveries: number;
            failedRecoveries: number;
        };
        unresolvedRecoveryConditions: string[];
        isStopped: boolean;
        stopReason: string;
        createdAt?: number;
    }): DurableResilienceStateRecord;
    /**
     * Rehydrates persisted state from disk.
     * Validates integrity hash and schema version.
     * If state is corrupted, rejects it fail-closed and returns a safely rebuilt baseline.
     */
    loadState(): {
        state: DurableResilienceStateRecord;
        wasReconstructed: boolean;
        wasCorrupted: boolean;
    };
    private _createEmptyState;
}
