import { SelfCorrectionRecord } from './partnershipTypes';
import { PersonalMemoryStore } from './personalMemoryStore';
export interface CreateSelfCorrectionParams {
    previousAssessment: string;
    newEvidence: string;
    detectedError: string;
    correctedAssessment: string;
    confidenceBefore: number;
    confidenceAfter: number;
    affectedDecisions?: string[];
    associatedMemoryId?: string;
}
export declare class SelfCorrectionEngine {
    private readonly corrections;
    /**
     * Record an explicit self-correction.
     * If an associated memory is provided and memoryStore is passed, update its status.
     */
    recordCorrection(params: CreateSelfCorrectionParams, memoryStore?: PersonalMemoryStore): SelfCorrectionRecord;
    /**
     * Retrieve all recorded self-corrections.
     */
    getAllCorrections(): SelfCorrectionRecord[];
    /**
     * Retrieve a specific self-correction record by ID.
     */
    getCorrection(correctionId: string): SelfCorrectionRecord | undefined;
    /**
     * Clear all records (for reset/testing).
     */
    clear(): void;
}
