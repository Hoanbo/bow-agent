import { PersonalPattern, PersonalPatternType } from './personalOsTypes';
export interface PatternObservation {
    patternType: PersonalPatternType;
    patternKey: string;
    evidenceDetail: string;
    timestamp: number;
}
export declare class PersonalPatternEngine {
    private readonly observations;
    private readonly detectedPatterns;
    private readonly minThreshold;
    constructor(options?: {
        minEvidenceThreshold?: number;
    });
    /**
     * Ingest a discrete evidence observation.
     */
    recordObservation(patternType: PersonalPatternType, patternKey: string, evidenceDetail: string): void;
    /**
     * Analyze accumulated observations and synthesize verified patterns.
     */
    analyzePatterns(): PersonalPattern[];
    /**
     * Retrieve all verified patterns.
     */
    getAllPatterns(): PersonalPattern[];
    /**
     * Retrieve patterns filtered by type.
     */
    getPatternsByType(patternType: PersonalPatternType): PersonalPattern[];
    /**
     * Clear all observations and patterns (for reset/testing).
     */
    clear(): void;
}
