import type { WorldModelContradiction, ContradictionClaim, ContradictionSeverity } from './worldModelTypes.js';
export declare class WorldModelContradictionEngine {
    private readonly _contradictions;
    recordContradiction(sourceA: ContradictionClaim, sourceB: ContradictionClaim, evidence: string, confidence?: number, severity?: ContradictionSeverity, ownerConfirmationRequired?: boolean): WorldModelContradiction;
    /**
     * Detects conflict between a stated premise/memory and live observed telemetry.
     */
    detectTelemetryConflict(statedClaim: string, observedTelemetryClaim: string, evidenceDetail: string, severity?: ContradictionSeverity): WorldModelContradiction;
    /**
     * Detects conflict between an expected outcome and an actual verified outcome.
     */
    detectOutcomeConflict(expectedOutcome: string, actualOutcome: string, actionId: string): WorldModelContradiction;
    /**
     * Resolves a contradiction through empirical verified evidence.
     */
    resolveWithEvidence(contradictionId: string, evidenceProof: string): boolean;
    /**
     * Resolves a contradiction through explicit Master Owner confirmation.
     */
    resolveWithOwnerConfirmation(contradictionId: string): boolean;
    getUnresolved(): WorldModelContradiction[];
    getAll(): WorldModelContradiction[];
    reset(): void;
}
export declare const globalWorldModelContradictionEngine: WorldModelContradictionEngine;
