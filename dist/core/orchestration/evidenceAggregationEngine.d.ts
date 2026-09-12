import type { EvidenceBundle, EvidenceRecord, EvidenceBundleEpistemicState, TaskGroupId, TaskId, TaskContradiction, OrchestrationErrorCode } from './taskOrchestrationTypes.js';
export declare class EvidenceAggregationError extends Error {
    readonly code: OrchestrationErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: OrchestrationErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
export declare class EvidenceAggregationEngine {
    private readonly bundles;
    /**
     * Calculates deterministic SHA-256 hash over an array of sorted constituent evidence hashes.
     */
    computeBundleHash(evidenceList: readonly EvidenceRecord[]): string;
    /**
     * Evaluates the epistemic state of an aggregated evidence bundle.
     */
    evaluateEpistemicState(evidenceList: readonly EvidenceRecord[], contradictions: readonly TaskContradiction[]): EvidenceBundleEpistemicState;
    /**
     * Aggregates a set of evidence records into a tamper-evident EvidenceBundle.
     */
    aggregateEvidence(params: {
        taskGroupId: TaskGroupId;
        taskId?: TaskId;
        sessionId: string;
        evidenceList: readonly EvidenceRecord[];
        contradictions?: readonly TaskContradiction[];
    }): EvidenceBundle;
    /**
     * Verifies the cryptographic integrity of an existing EvidenceBundle.
     */
    verifyBundleIntegrity(bundle: EvidenceBundle): {
        intact: boolean;
        computedHash: string;
        error?: string;
    };
    getBundle(bundleId: string): EvidenceBundle | undefined;
    clear(): void;
}
export declare const globalEvidenceAggregationEngine: EvidenceAggregationEngine;
