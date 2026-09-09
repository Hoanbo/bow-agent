// src/core/resilience/selfReflectiveEngine.ts
// BOWCON V4.0 — MS-1.3.43: SELF-REFLECTIVE COGNITIVE ENGINE
//
// Governed self-reflection on reasoning quality, decision quality, and prediction quality.
//
// CRITICAL INVARIANTS:
// SELF_REFLECTION    != AUTHORITY
// SELF_CORRECTION    != AUTHORIZATION
// LEARNING           != EXECUTION
// INSIGHT            != OWNERSHIP
// REFLECTION         != SECURITY_OVERRIDE
// REFLECTION         != HUMAN_GATE_BYPASS
//
// Self-reflection may produce:
//   REFLECTION / INSIGHT / LESSON / PATTERN / RECOMMENDATION / CORRECTION
//
// Self-reflection must NEVER produce:
//   AUTHORITY / OWNERSHIP / UNRESTRICTED_EXECUTION / SECURITY_OVERRIDE
//
// PREDICTION != FACT: Verified prediction remains a verified prediction, not retroactively a fact.
// Historical records are immutable. Reflections are additive only.
import { generateResilienceId, } from './cognitiveResilienceTypes.js';
export class SelfReflectiveEngine {
    _reflections = [];
    /**
     * Generates a governed self-reflection record.
     * INVARIANT: result is bounded to recommendation — cannot become authority.
     */
    reflect(input) {
        const reasoningQuality = this._assessReasoningQuality(input.reasoningWasEvidenceBacked, input.assumptionsUsed, input.missingInformation);
        const decisionQuality = this._assessDecisionQuality(input.recommendationMatchedOutcome);
        const predictionQuality = this._assessPredictionQuality(input.predictionOutcome);
        const insights = this._generateInsights(input, reasoningQuality, decisionQuality, predictionQuality);
        const lessons = this._generateLessons(input, reasoningQuality, decisionQuality, predictionQuality);
        const patterns = this._detectPatterns(input, reasoningQuality, decisionQuality);
        const record = {
            reflectionId: generateResilienceId('ref'),
            reflectedAt: Date.now(),
            subjectEpisodeId: input.subjectEpisodeId,
            subjectDecisionId: input.subjectDecisionId,
            reasoningQuality,
            decisionQuality,
            predictionQuality,
            wasEvidenceBacked: input.reasoningWasEvidenceBacked,
            relianceOnAssumptions: input.assumptionsUsed.length > 0
                ? Math.min(1, input.assumptionsUsed.length * 0.2)
                : 0,
            missingInformation: input.missingInformation,
            bowconRecommendation: input.bowconRecommendation,
            ownerDecision: input.ownerDecision,
            recommendationMatchedReality: input.recommendationMatchedOutcome ?? null,
            insights,
            lessons,
            patterns,
            openQuestions: this._generateOpenQuestions(input),
            // INVARIANT: always bounded to recommendation — never authority
            isBoundedToRecommendation: true,
        };
        this._reflections.push(record);
        return record;
    }
    _assessReasoningQuality(evidenceBacked, assumptions, missing) {
        if (!evidenceBacked && assumptions.length > 2)
            return 'REASONING_ASSUMPTION_BASED';
        if (missing.length > 2)
            return 'REASONING_INCOMPLETE';
        if (evidenceBacked && assumptions.length === 0 && missing.length === 0)
            return 'REASONING_SOUND';
        if (!evidenceBacked)
            return 'REASONING_ASSUMPTION_BASED';
        if (missing.length > 0)
            return 'REASONING_INCOMPLETE';
        return 'REASONING_SOUND';
    }
    _assessDecisionQuality(matched) {
        if (matched === null || matched === undefined)
            return 'UNKNOWN';
        if (matched === true)
            return 'RECOMMENDATION_CORRECT';
        if (matched === false)
            return 'RECOMMENDATION_INCORRECT';
        return 'UNKNOWN';
    }
    _assessPredictionQuality(outcome) {
        if (!outcome || outcome === 'UNVERIFIED')
            return 'PREDICTION_UNVERIFIED';
        if (outcome === 'VERIFIED_CORRECT')
            return 'PREDICTION_VERIFIED';
        return 'PREDICTION_REFUTED';
    }
    _generateInsights(input, reasoning, decision, prediction) {
        const insights = [];
        if (reasoning === 'REASONING_ASSUMPTION_BASED') {
            insights.push(`Reasoning for episode '${input.subjectEpisodeId}' relied on ${input.assumptionsUsed.length} unverified assumption(s). Future decisions should obtain direct evidence first.`);
        }
        if (reasoning === 'REASONING_INCOMPLETE') {
            insights.push(`Information gap detected: ${input.missingInformation.join(', ')}. Missing information limited reasoning quality.`);
        }
        if (decision === 'RECOMMENDATION_INCORRECT') {
            insights.push(`BOWCON's recommendation did not match the verified outcome. This is a learning signal — confidence calibration recommended.`);
            if (input.ownerDecision && input.bowconRecommendation && input.ownerDecision !== input.bowconRecommendation) {
                insights.push(`Owner chose '${input.ownerDecision}' over BOWCON recommendation '${input.bowconRecommendation}'. Owner override is valid — BOWCON's model needs refinement.`);
            }
        }
        if (prediction === 'PREDICTION_REFUTED') {
            // INVARIANT: refuted prediction remains a refuted prediction — not retroactively a fact
            insights.push(`Prediction was refuted by verified evidence. The original prediction record is preserved as-is (not rewritten). This is normal epistemic correction.`);
        }
        if (reasoning === 'REASONING_SOUND' && decision === 'RECOMMENDATION_CORRECT') {
            insights.push(`Reasoning was evidence-backed and recommendation matched verified outcome. Positive calibration signal.`);
        }
        return insights;
    }
    _generateLessons(input, reasoning, decision, _prediction) {
        const lessons = [];
        if (reasoning === 'REASONING_ASSUMPTION_BASED') {
            for (const assumption of input.assumptionsUsed) {
                lessons.push(`Assumption '${assumption}' should be verified before use in future reasoning.`);
            }
        }
        if (decision === 'RECOMMENDATION_INCORRECT' && input.actualOutcome) {
            lessons.push(`Future reasoning should account for: '${input.actualOutcome}' (actual outcome that differed from recommendation).`);
        }
        if (input.missingInformation.length > 0) {
            lessons.push(`Proactively seek: ${input.missingInformation.join(', ')} before committing to similar recommendations.`);
        }
        return lessons;
    }
    _detectPatterns(input, reasoning, decision) {
        const patterns = [];
        // Detect overconfidence pattern
        if (decision === 'RECOMMENDATION_INCORRECT' && reasoning === 'REASONING_SOUND') {
            patterns.push('POTENTIAL_OVERCONFIDENCE: Sound reasoning led to incorrect recommendation — confidence calibration review recommended.');
        }
        // Detect information gap pattern
        if (input.missingInformation.length >= 3) {
            patterns.push('RECURRING_INFORMATION_GAP: Multiple missing information items suggest a systematic gap in world model completeness.');
        }
        // Detect assumption reliance pattern
        if (input.assumptionsUsed.length >= 2 && decision === 'RECOMMENDATION_INCORRECT') {
            patterns.push('ASSUMPTION_LED_FAILURE: Recommendation failure coincided with high assumption reliance. Evidence-first approach needed.');
        }
        return patterns;
    }
    _generateOpenQuestions(input) {
        const questions = [];
        if (input.predictionOutcome === 'UNVERIFIED') {
            questions.push(`Has the prediction for episode '${input.subjectEpisodeId}' been independently verified yet?`);
        }
        if (input.recommendationMatchedOutcome === null) {
            questions.push(`Was the BOWCON recommendation ultimately correct? Outcome verification pending.`);
        }
        if (input.missingInformation.length > 0) {
            questions.push(`Can the following information gaps be closed? ${input.missingInformation.join(', ')}`);
        }
        return questions;
    }
    // ---------------------------------------------------------------------------
    // Accessors
    // ---------------------------------------------------------------------------
    getAllReflections() {
        return [...this._reflections];
    }
    getLatestReflection() {
        return this._reflections[this._reflections.length - 1];
    }
    getReflectionsForEpisode(episodeId) {
        return this._reflections.filter((r) => r.subjectEpisodeId === episodeId);
    }
    getReflectionCount() {
        return this._reflections.length;
    }
    /**
     * Summary of recurring reflection patterns across all episodes.
     * Advisory only — cannot become authority.
     */
    getCognitiveSummary() {
        const all = this._reflections;
        return {
            totalReflections: all.length,
            soundReasoningCount: all.filter((r) => r.reasoningQuality === 'REASONING_SOUND').length,
            assumptionBasedCount: all.filter((r) => r.reasoningQuality === 'REASONING_ASSUMPTION_BASED').length,
            incompleteReasoningCount: all.filter((r) => r.reasoningQuality === 'REASONING_INCOMPLETE').length,
            correctRecommendationCount: all.filter((r) => r.decisionQuality === 'RECOMMENDATION_CORRECT').length,
            incorrectRecommendationCount: all.filter((r) => r.decisionQuality === 'RECOMMENDATION_INCORRECT').length,
            unverifiedPredictions: all.filter((r) => r.predictionQuality === 'PREDICTION_UNVERIFIED').length,
            refutedPredictions: all.filter((r) => r.predictionQuality === 'PREDICTION_REFUTED').length,
            verifiedPredictions: all.filter((r) => r.predictionQuality === 'PREDICTION_VERIFIED').length,
            // INVARIANT: summary is advisory only
            isBoundedToAdvisory: true,
        };
    }
    clear() {
        this._reflections.length = 0;
    }
}
export const globalSelfReflectiveEngine = new SelfReflectiveEngine();
