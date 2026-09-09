import { ReflectionRecord } from './cognitiveResilienceTypes.js';
export interface ReflectionInput {
    subjectEpisodeId: string;
    subjectDecisionId?: string;
    bowconRecommendation?: string;
    ownerDecision?: string;
    reasoningWasEvidenceBacked: boolean;
    assumptionsUsed: string[];
    missingInformation: string[];
    predictionMade?: string;
    predictionOutcome?: 'VERIFIED_CORRECT' | 'VERIFIED_INCORRECT' | 'UNVERIFIED';
    recommendationMatchedOutcome?: boolean | null;
    actualOutcome?: string;
}
export declare class SelfReflectiveEngine {
    private readonly _reflections;
    /**
     * Generates a governed self-reflection record.
     * INVARIANT: result is bounded to recommendation — cannot become authority.
     */
    reflect(input: ReflectionInput): ReflectionRecord;
    private _assessReasoningQuality;
    private _assessDecisionQuality;
    private _assessPredictionQuality;
    private _generateInsights;
    private _generateLessons;
    private _detectPatterns;
    private _generateOpenQuestions;
    getAllReflections(): ReflectionRecord[];
    getLatestReflection(): ReflectionRecord | undefined;
    getReflectionsForEpisode(episodeId: string): ReflectionRecord[];
    getReflectionCount(): number;
    /**
     * Summary of recurring reflection patterns across all episodes.
     * Advisory only — cannot become authority.
     */
    getCognitiveSummary(): {
        totalReflections: number;
        soundReasoningCount: number;
        assumptionBasedCount: number;
        incompleteReasoningCount: number;
        correctRecommendationCount: number;
        incorrectRecommendationCount: number;
        unverifiedPredictions: number;
        refutedPredictions: number;
        verifiedPredictions: number;
        isBoundedToAdvisory: true;
    };
    clear(): void;
}
export declare const globalSelfReflectiveEngine: SelfReflectiveEngine;
