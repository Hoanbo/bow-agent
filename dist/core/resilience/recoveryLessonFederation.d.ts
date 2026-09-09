import { CognitiveEpisode, CrossEpisodePattern, RecoveryLessonFederationRecord, RecoveryLessonFederationRecordType } from './cognitiveResilienceTypes.js';
import { CrossEpisodePatternEngine } from './crossEpisodePatternEngine.js';
export declare class RecoveryLessonFederationEngine {
    private readonly _advisoryRecords;
    private readonly _patternEngine;
    constructor(patternEngine?: CrossEpisodePatternEngine);
    /**
     * Federates episodic lessons from an episode into governed advisory records.
     */
    federateFromEpisode(episode: CognitiveEpisode): RecoveryLessonFederationRecord[];
    /**
     * Federates cross-episode patterns into planning cautions and capability risks.
     */
    federateFromPattern(pattern: CrossEpisodePattern): RecoveryLessonFederationRecord;
    /**
     * Invariant verification: an advisory record must NEVER overwrite a direct fact.
     * Throws if an attempt is made to replace a world fact with an advisory.
     */
    assertCannotOverwriteWorldFact(advisoryId: string, worldFactKey: string): void;
    getAdvisory(recordId: string): RecoveryLessonFederationRecord | undefined;
    getAllAdvisories(): RecoveryLessonFederationRecord[];
    getAdvisoriesByType(type: RecoveryLessonFederationRecordType): RecoveryLessonFederationRecord[];
    clear(): void;
}
export declare const globalRecoveryLessonFederationEngine: RecoveryLessonFederationEngine;
