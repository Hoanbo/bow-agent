import { CognitiveEpisode, EpisodeEvent, EpisodeLesson } from './cognitiveResilienceTypes.js';
export declare class EpisodicMemorySynthesisEngine {
    private readonly _episodes;
    private readonly _storagePath;
    constructor(storageDir?: string);
    openEpisode(params: {
        projectId: string;
        goalId: string;
        triggeringContext: string;
        relatedObjective: string;
        ownerId?: string;
    }): CognitiveEpisode;
    appendEvent(episodeId: string, event: Omit<EpisodeEvent, 'eventId'>): EpisodeEvent;
    appendObservation(episodeId: string, observation: string, provenance: string): void;
    recordDecision(episodeId: string, params: {
        decision: string;
        bowconRecommendation?: string;
        ownerDecision?: string;
    }): void;
    recordAuthorizedAction(episodeId: string, actionId: string): void;
    recordExecutionResult(episodeId: string, result: string): void;
    recordVerificationResult(episodeId: string, result: string): void;
    recordOutcome(episodeId: string, outcome: string, confidence: number): void;
    appendLesson(episodeId: string, lesson: Omit<EpisodeLesson, 'lessonId'>): EpisodeLesson;
    appendContradiction(episodeId: string, contradiction: string): void;
    appendUncertainty(episodeId: string, uncertainty: string): void;
    completeEpisode(episodeId: string): void;
    markInterrupted(episodeId: string): void;
    getEpisode(episodeId: string): CognitiveEpisode | undefined;
    getAllEpisodes(): CognitiveEpisode[];
    getEpisodesByProject(projectId: string): CognitiveEpisode[];
    getCompletedEpisodes(): CognitiveEpisode[];
    getInterruptedEpisodes(): CognitiveEpisode[];
    /**
     * Reconstructs episode from persisted storage.
     * Validates integrity hash and rejects corrupted episodes.
     */
    reconstructEpisode(episodeId: string): {
        episode: CognitiveEpisode | null;
        valid: boolean;
        reason: string;
    };
    private _getEpisode;
    private _refreshHash;
    private _persist;
    private _rehydrate;
    clear(): void;
}
export declare const globalEpisodicMemorySynthesisEngine: EpisodicMemorySynthesisEngine;
