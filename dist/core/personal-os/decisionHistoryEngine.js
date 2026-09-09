// src/core/personal-os/decisionHistoryEngine.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Section 9: Decision History Intelligence
// Tracks past decisions, alternatives, recommendations, Owner choices, verified outcomes, and lessons.
// Answers retrospective questions: Why did we choose this? Was the assumption correct? What did we learn?
//
// Invariants:
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - OWNER_OVERRIDE != BOWCON_FAILURE
// - Inferences must never rewrite historical facts.
import { generatePersonalOsId, MASTER_OWNER_ID, } from './personalOsTypes';
export class DecisionHistoryEngine {
    records = new Map();
    /**
     * Record a new decision in history.
     */
    recordDecision(params, memoryStore) {
        const decisionId = generatePersonalOsId('dec_hist');
        const record = {
            decisionId,
            ownerId: params.ownerId || MASTER_OWNER_ID,
            decision: params.decision,
            context: params.context,
            alternatives: params.alternatives,
            ownerDecision: params.ownerDecision,
            bowconRecommendation: params.bowconRecommendation,
            reasoning: params.reasoning,
            evidence: params.evidence,
            expectedOutcome: params.expectedOutcome,
            actualOutcome: params.actualOutcome,
            verifiedOutcome: params.verifiedOutcome,
            lessons: params.lessons ?? [],
            timestamp: Date.now(),
        };
        this.records.set(decisionId, record);
        if (memoryStore) {
            memoryStore.addMemory({
                ownerId: record.ownerId,
                category: 'DECISION',
                content: `Decision: ${record.decision} (Chosen: ${record.ownerDecision})`,
                source: `DecisionHistoryEngine:${decisionId}`,
                confidence: 1.0,
                certainty: 'HIGH',
                provenance: 'OWNER_EXPLICIT',
                tags: ['decision', 'history', 'retrospective'],
                metadata: {
                    decisionId,
                    expectedOutcome: record.expectedOutcome,
                    bowconRecommendation: record.bowconRecommendation,
                },
            });
        }
        return record;
    }
    /**
     * Complete post-mortem on a decision after verified execution.
     */
    recordOutcomePostMortem(decisionId, actualOutcome, verifiedOutcome, lessons) {
        const record = this.records.get(decisionId);
        if (!record) {
            throw new Error(`Decision record '${decisionId}' not found.`);
        }
        record.actualOutcome = actualOutcome;
        record.verifiedOutcome = verifiedOutcome;
        record.lessons.push(...lessons);
        record.postMortemCompletedAt = Date.now();
        return record;
    }
    /**
     * Answer retrospective query: "Why did we choose this?"
     */
    explainDecision(decisionQuery) {
        const term = decisionQuery.toLowerCase();
        for (const r of this.records.values()) {
            if (r.decision.toLowerCase().includes(term) ||
                r.context.toLowerCase().includes(term) ||
                r.ownerDecision.toLowerCase().includes(term)) {
                const wasOverride = r.bowconRecommendation && r.ownerDecision !== r.bowconRecommendation;
                const overrideText = wasOverride
                    ? ` Note: Master Owner explicitly chose '${r.ownerDecision}' over BOWCON's recommendation of '${r.bowconRecommendation}'.`
                    : '';
                const outcomeText = r.actualOutcome
                    ? ` Outcome was verified as: ${r.actualOutcome}.`
                    : ' Outcome pending or unrecorded.';
                const lessonsText = r.lessons.length > 0
                    ? ` Key lessons: ${r.lessons.join('; ')}.`
                    : '';
                return {
                    found: true,
                    record: r,
                    explanation: `We chose '${r.ownerDecision}' for '${r.decision}' because: ${r.reasoning}.${overrideText}${outcomeText}${lessonsText}`,
                };
            }
        }
        return {
            found: false,
            explanation: `No historical decision matching '${decisionQuery}' was found in the decision ledger.`,
        };
    }
    /**
     * Retrieve all decision records.
     */
    getAllRecords() {
        return Array.from(this.records.values());
    }
    /**
     * Retrieve a specific decision record by ID.
     */
    getRecord(decisionId) {
        return this.records.get(decisionId);
    }
    /**
     * Clear all records (for reset/testing).
     */
    clear() {
        this.records.clear();
    }
}
