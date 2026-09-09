import { OutcomeLearningRecord } from './partnershipTypes';
import { PersonalMemoryStore } from './personalMemoryStore';
import { PersonalKnowledgeGraph } from './personalKnowledgeGraph';
export interface OutcomeEvaluationParams {
    actionId: string;
    expectedOutcome: string;
    actualOutcome: string;
    executionVerified: boolean;
    verificationDetails?: Record<string, any>;
    assumptions?: string[];
    sideEffectsObserved?: string[];
    environmentalConditions?: string[];
}
export declare class OutcomeLearningEngine {
    private readonly records;
    /**
     * Evaluate execution outcome and generate learning insights.
     */
    evaluateOutcome(params: OutcomeEvaluationParams, memoryStore?: PersonalMemoryStore, knowledgeGraph?: PersonalKnowledgeGraph): OutcomeLearningRecord;
    /**
     * Retrieve all recorded learnings.
     */
    getAllLearnings(): OutcomeLearningRecord[];
    /**
     * Retrieve learnings filtered by verdict.
     */
    getLearningsByVerdict(verdict: 'SUCCESS' | 'PARTIAL' | 'FAILURE'): OutcomeLearningRecord[];
    /**
     * Clear all learnings (for testing).
     */
    clear(): void;
}
