import type { WorldModelSelfCorrectionRecord, EpistemicProvenance } from './worldModelTypes.js';
type SelfCorrectionRecord = WorldModelSelfCorrectionRecord;
export declare class EnhancedSelfCorrectionEngine {
    private readonly _corrections;
    /**
     * Evaluates if new evidence is epistemically superior to the prior belief.
     */
    canCorrect(priorProvenance: EpistemicProvenance, evidenceProvenance: EpistemicProvenance): boolean;
    /**
     * Applies and records an honest self-correction without erasing historical records.
     */
    applyCorrection(originalBelief: string, provenanceBefore: EpistemicProvenance, newEvidence: string, evidenceProvenance: EpistemicProvenance, correction: string, confidenceBefore: number, confidenceAfter: number, sourceOfCorrection: string, contradictionRef?: string): SelfCorrectionRecord;
    getHistory(): readonly SelfCorrectionRecord[];
    getCorrectionCount(): number;
    getLatestCorrection(): SelfCorrectionRecord | undefined;
    reset(): void;
}
export declare const globalEnhancedSelfCorrectionEngine: EnhancedSelfCorrectionEngine;
export {};
