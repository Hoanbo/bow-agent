import { CognitiveEpisode, CrossEpisodePattern, CrossEpisodePatternType, PatternProvenance, PatternStatus } from './cognitiveResilienceTypes.js';
export declare class CrossEpisodePatternEngine {
    private readonly _patterns;
    private readonly _contradictoryEvidenceMap;
    /**
     * Mines patterns across an array of cognitive episodes.
     * Enforces minimum evidence threshold (>= 2 observations).
     */
    minePatterns(episodes: CognitiveEpisode[]): CrossEpisodePattern[];
    /**
     * Registers an explicit candidate pattern with strict validation:
     * Rejects any pattern with fewer than 2 supporting observations.
     */
    registerPattern(params: {
        patternType: CrossEpisodePatternType;
        description: string;
        supportingEpisodeIds: string[];
        observationCount?: number;
        firstObservedAt?: number;
        lastObservedAt?: number;
        confidence?: number;
        provenance?: PatternProvenance;
        patternStatus?: PatternStatus;
        contradictoryEvidence?: string[];
        unresolvedUncertainty?: string[];
        recommendedAction?: string;
    }): CrossEpisodePattern;
    /**
     * Adds contradictory evidence against an identified pattern.
     * If contradictory evidence exceeds threshold, status transitions to REFUTED or MONITORING.
     */
    addContradictoryEvidence(patternId: string, contradictoryEpisodeId: string, reason: string): void;
    /**
     * Master Owner affirmation of a pattern elevates provenance to OWNER_CONFIRMED_PATTERN.
     * Invariant: Only Owner can affirm; BOWCON cannot self-affirm.
     */
    affirmByOwner(patternId: string, ownerId: string): CrossEpisodePattern;
    getPattern(patternId: string): CrossEpisodePattern | undefined;
    getAllPatterns(): CrossEpisodePattern[];
    getActivePatterns(): CrossEpisodePattern[];
    clear(): void;
    private _registerOrUpdatePattern;
}
export declare const globalCrossEpisodePatternEngine: CrossEpisodePatternEngine;
