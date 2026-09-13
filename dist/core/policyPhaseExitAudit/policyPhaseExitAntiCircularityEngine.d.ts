import type { AuditEvidenceItem } from './policyPhaseExitAuditTypes.js';
export interface CircularityAnalysisResult {
    readonly hasCycles: boolean;
    readonly cyclesDetected: readonly string[];
    readonly groundedCriteriaCount: number;
    readonly ungroundedCriteria: readonly string[];
}
export declare class PolicyPhaseExitAntiCircularityEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Analyzes an array of evidence items for circular references and physical grounding.
     */
    analyzeEvidence(evidenceItems: readonly AuditEvidenceItem[]): CircularityAnalysisResult;
}
