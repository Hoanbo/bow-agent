// src/core/partnership/outcomeLearningEngine.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Section 12: Outcome Learning Engine
// Governed cycle: EXECUTE -> VERIFY -> EVALUATE -> LEARN
// Compares EXPECTED OUTCOME vs ACTUAL OUTCOME and persists verified lessons.
//
// Invariants:
// - LEARNING != AUTHORIZATION
// - Learning must not bypass governance.
// - Learning must not grant execution authority.
// - Memories created from verified executions receive EXECUTION_VERIFIED provenance.
import { generatePartnershipId, MASTER_OWNER_ID, } from './partnershipTypes';
export class OutcomeLearningEngine {
    records = new Map();
    /**
     * Evaluate execution outcome and generate learning insights.
     */
    evaluateOutcome(params, memoryStore, knowledgeGraph) {
        const learningId = generatePartnershipId('learn');
        const expected = params.expectedOutcome.trim();
        const actual = params.actualOutcome.trim();
        let verdict;
        const incorrectAssumptions = [];
        const incorrectPredictions = [];
        const learnedInsights = [];
        const expectedTokens = expected.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
        const actualTokens = actual.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
        const commonTokens = expectedTokens.filter((t) => actualTokens.includes(t));
        const tokenOverlap = expectedTokens.length > 0 ? commonTokens.length / expectedTokens.length : 1;
        const isMatch = actual.toLowerCase() === expected.toLowerCase() ||
            actual.toLowerCase().includes(expected.toLowerCase()) ||
            expected.toLowerCase().includes(actual.toLowerCase()) ||
            tokenOverlap >= 0.5;
        if (params.executionVerified && isMatch) {
            if ((params.sideEffectsObserved && params.sideEffectsObserved.length > 0) || (params.assumptions && params.assumptions.length > 0 && !isMatch)) {
                verdict = 'PARTIAL';
                learnedInsights.push(`Action succeeded but exhibited unexpected conditions or side effects.`);
            }
            else {
                verdict = 'SUCCESS';
                learnedInsights.push(`Execution verified successfully against expected outcome.`);
            }
        }
        else if (!params.executionVerified || !isMatch) {
            verdict = 'FAILURE';
            incorrectPredictions.push(`Expected '${expected}', but actual outcome was '${actual}'.`);
            learnedInsights.push(`Action failed independent verification; assumptions require review.`);
        }
        else {
            verdict = 'PARTIAL';
        }
        // Inspect assumptions
        if (verdict === 'FAILURE' && params.assumptions && params.assumptions.length > 0) {
            for (const a of params.assumptions) {
                incorrectAssumptions.push(a);
                learnedInsights.push(`Assumption '${a}' disproven or unverified by execution.`);
            }
        }
        const record = {
            learningId,
            actionId: params.actionId,
            expectedOutcome: expected,
            actualOutcome: actual,
            verdict,
            unexpectedSideEffects: params.sideEffectsObserved ?? [],
            unexpectedEnvironmentalConditions: params.environmentalConditions ?? [],
            incorrectAssumptions,
            incorrectPredictions,
            learnedInsights,
            timestamp: Date.now(),
        };
        this.records.set(learningId, record);
        // If memoryStore provided, persist as EXECUTION_VERIFIED memory
        if (memoryStore) {
            const summaryContent = `Execution outcome for ${params.actionId}: [${verdict}] Actual: ${actual}. Insights: ${learnedInsights.join('; ')}`;
            memoryStore.createMemory({
                ownerId: MASTER_OWNER_ID,
                category: 'OUTCOME',
                content: summaryContent,
                source: `OutcomeLearningEngine:${params.actionId}`,
                confidence: params.executionVerified ? 0.95 : 0.4,
                certainty: params.executionVerified ? 'HIGH' : 'LOW',
                provenance: 'EXECUTION_VERIFIED',
                tags: ['outcome', verdict.toLowerCase(), 'learning'],
                metadata: {
                    actionId: params.actionId,
                    verdict,
                    learningId,
                    verificationDetails: params.verificationDetails,
                },
            });
        }
        // If knowledgeGraph provided, add outcome node and edge
        if (knowledgeGraph) {
            const outcomeNodeId = `node_outcome_${learningId}`;
            knowledgeGraph.addNode({
                id: outcomeNodeId,
                label: `Outcome: ${verdict} (${params.actionId})`,
                type: 'OUTCOME',
                properties: {
                    verdict,
                    actualOutcome: actual,
                    learningId,
                },
            });
        }
        return record;
    }
    /**
     * Retrieve all recorded learnings.
     */
    getAllLearnings() {
        return Array.from(this.records.values());
    }
    /**
     * Retrieve learnings filtered by verdict.
     */
    getLearningsByVerdict(verdict) {
        return Array.from(this.records.values()).filter((r) => r.verdict === verdict);
    }
    /**
     * Clear all learnings (for testing).
     */
    clear() {
        this.records.clear();
    }
}
