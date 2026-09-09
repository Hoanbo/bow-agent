import { ContradictionRecord, ContradictionType, PersonalMemoryItem } from './partnershipTypes';
export declare class ContradictionEngine {
    private readonly contradictions;
    /**
     * Record an explicit contradiction.
     */
    recordContradiction(type: ContradictionType, previousBelief: string, currentEvidence: string, recommendedAction: string): ContradictionRecord;
    /**
     * Check for telemetry vs stored memory conflict.
     */
    detectTelemetryVsMemory(metricKey: string, observedValue: any, memoryBeliefValue: any, memoryItem?: PersonalMemoryItem): ContradictionRecord | null;
    /**
     * Check for observation vs assumption conflict.
     */
    detectObservationVsAssumption(assumption: string, observedFact: string, context?: string): ContradictionRecord | null;
    /**
     * Check for outcome vs expectation conflict.
     */
    detectOutcomeVsExpectation(actionId: string, expectedOutcome: string, actualOutcome: string): ContradictionRecord | null;
    /**
     * Check for statement vs verified fact conflict.
     */
    detectStatementVsFact(statement: string, verifiedFact: string, context?: string): ContradictionRecord | null;
    /**
     * Check capability availability against previous belief.
     */
    detectCapabilityContradiction(capabilityId: string, isAvailableNow: boolean, previouslyBelievedAvailable: boolean): ContradictionRecord | null;
    /**
     * Resolve an existing contradiction with rationale.
     */
    resolveContradiction(contradictionId: string, resolutionNotes: string): ContradictionRecord;
    /**
     * Query all unresolved contradictions.
     */
    getUnresolvedContradictions(): ContradictionRecord[];
    /**
     * Query all contradictions (resolved and unresolved).
     */
    getAllContradictions(): ContradictionRecord[];
    /**
     * Check if any unresolved contradictions exist.
     */
    hasUnresolvedContradictions(): boolean;
    /**
     * Clear all contradictions (e.g. for reset/testing).
     */
    clear(): void;
}
