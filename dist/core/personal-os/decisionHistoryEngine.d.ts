import { DecisionHistoryRecord } from './personalOsTypes';
import { PersonalMemoryStore } from '../partnership/personalMemoryStore';
export interface RecordDecisionParams {
    decision: string;
    context: string;
    alternatives: string[];
    ownerDecision: string;
    bowconRecommendation?: string;
    reasoning: string;
    evidence: string[];
    expectedOutcome: string;
    actualOutcome?: string;
    verifiedOutcome?: boolean;
    lessons?: string[];
    ownerId?: string;
}
export declare class DecisionHistoryEngine {
    private readonly records;
    /**
     * Record a new decision in history.
     */
    recordDecision(params: RecordDecisionParams, memoryStore?: PersonalMemoryStore): DecisionHistoryRecord;
    /**
     * Complete post-mortem on a decision after verified execution.
     */
    recordOutcomePostMortem(decisionId: string, actualOutcome: string, verifiedOutcome: boolean, lessons: string[]): DecisionHistoryRecord;
    /**
     * Answer retrospective query: "Why did we choose this?"
     */
    explainDecision(decisionQuery: string): {
        found: boolean;
        record?: DecisionHistoryRecord;
        explanation: string;
    };
    /**
     * Retrieve all decision records.
     */
    getAllRecords(): DecisionHistoryRecord[];
    /**
     * Retrieve a specific decision record by ID.
     */
    getRecord(decisionId: string): DecisionHistoryRecord | undefined;
    /**
     * Clear all records (for reset/testing).
     */
    clear(): void;
}
