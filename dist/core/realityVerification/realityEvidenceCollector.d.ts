import type { ToolAdapterResult } from '../toolAdapter/toolAdapterTypes.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type RealityEvidence, type RealityEvidenceSource } from './realityVerificationTypes.js';
export interface RealityEvidenceCollectorOptions {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly maxEvidenceAgeMs?: number;
}
export declare class RealityEvidenceCollector {
    private readonly sanitizer;
    private readonly maxEvidenceAgeMs;
    private readonly observedEvidenceHashes;
    constructor(options?: RealityEvidenceCollectorOptions);
    /**
     * Collects, validates, and normalizes evidence items from an execution result and optional external observations.
     */
    collectEvidence(result: ToolAdapterResult, externalEvidence?: readonly RealityEvidence[], currentTimeMs?: number): readonly RealityEvidence[];
    /**
     * Validates an external evidence item against tenant, task, freshness, and bounds.
     */
    validateExternalEvidenceItem(item: RealityEvidence, result: ToolAdapterResult, now: number): void;
    /**
     * Scans for contradictory evidence across multiple sources for the same target path.
     */
    detectContradictions(evidenceList: readonly RealityEvidence[]): void;
    /**
     * Constructs an authoritative RealityEvidence item.
     */
    createEvidenceItem(params: {
        source: RealityEvidenceSource;
        path: string;
        observedValue: unknown;
        expectedValue?: unknown;
        timestamp: string;
        confidence: number;
        tenantId: string;
        taskId: string;
        executionId: string;
    }): RealityEvidence;
    /**
     * Computes deterministic SHA-256 evidence digest.
     */
    calculateEvidenceHash(params: {
        source: string;
        path: string;
        observedValue: unknown;
        timestamp: string;
        executionId: string;
    }): string;
    /**
     * Defensively inspects payload for size, depth, prototype pollution, and null bytes.
     */
    defensivelyValidatePayload(payload: unknown): void;
    private scanRecursive;
    /**
     * Resets replay tracking (for testing purposes).
     */
    resetReplayTracker(): void;
}
export declare const globalRealityEvidenceCollector: RealityEvidenceCollector;
