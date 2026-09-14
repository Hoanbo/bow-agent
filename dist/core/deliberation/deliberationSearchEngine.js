// src/core/deliberation/deliberationSearchEngine.ts
// BOWCON V4.0 — MS-1.5.05: BOUNDED DELIBERATION SEARCH ENGINE
// Component 1023 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// DELIBERATION != AUTHORIZATION
// DELIBERATION != EXECUTION
// HYPOTHESIS != FACT
// EVIDENCE != PROOF
// VECTOR MATCH != TRUTH
// USER_STOP > ALL MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
import { DELIBERATION_BOUNDS, CANONICAL_DELIBERATION_WEIGHTS, DeliberationUserStopError, DeliberationCapacityError, } from './deliberationTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalSymbolicConstraintEngine, } from './symbolicConstraintEngine.js';
import { globalHypothesisEngine } from './hypothesisEngine.js';
export class DeliberationSearchEngine {
    constraintEngine;
    hypothesisEngine;
    userStopProvider;
    constructor(options) {
        this.constraintEngine = options?.constraintEngine ?? globalSymbolicConstraintEngine;
        this.hypothesisEngine = options?.hypothesisEngine ?? globalHypothesisEngine;
        this.userStopProvider =
            options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * Deterministically scores and ranks candidate hypotheses within bounded depth and count limits.
     */
    searchAndRank(hypotheses, constraints, evidenceBindings, options) {
        // 1. Synchronous USER_STOP check
        if (this.userStopProvider()) {
            throw new DeliberationUserStopError('search_and_rank');
        }
        // 2. Capacity bounds check
        if (hypotheses.length > DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION) {
            throw new DeliberationCapacityError(hypotheses.length, DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION, 'hypotheses in search evaluation');
        }
        const maxDepth = Math.min(options?.maxDepth ?? DELIBERATION_BOUNDS.MAX_INFERENCE_DEPTH, DELIBERATION_BOUNDS.MAX_INFERENCE_DEPTH);
        const convergenceThreshold = options?.convergenceThreshold ?? 0.65;
        const evaluated = [];
        const allContradictions = [];
        let iterations = 0;
        // Deterministic evaluation loop
        for (const rawHypo of hypotheses) {
            if (this.userStopProvider()) {
                throw new DeliberationUserStopError('search_evaluation_iteration');
            }
            if (iterations >= maxDepth * hypotheses.length) {
                break; // Guard against infinite loops
            }
            iterations++;
            // Evaluate symbolic constraints
            const evalResult = this.constraintEngine.evaluateHypothesis(rawHypo, constraints, evidenceBindings);
            if (evalResult.contradictions.length > 0) {
                allContradictions.push(...evalResult.contradictions);
            }
            // Compute refutation penalty
            const supporting = evidenceBindings.filter((e) => rawHypo.supportingEvidenceIds.includes(e.evidenceId));
            const refuting = evidenceBindings.filter((e) => rawHypo.refutingEvidenceIds.includes(e.evidenceId));
            const totalEv = supporting.length + refuting.length;
            const refutingRatio = totalEv > 0 ? refuting.length / totalEv : 0.0;
            // Deterministic combined confidence formula
            // C = clamp(0.60 * Validity + 0.40 * Plausibility - 0.50 * RefutingRatio, 0.0, 1.0)
            const validityScore = evalResult.validityScore;
            const plausibilityScore = rawHypo.plausibilityScore;
            let combinedConfidence = CANONICAL_DELIBERATION_WEIGHTS.symbolicValidityWeight * validityScore +
                CANONICAL_DELIBERATION_WEIGHTS.neuralPlausibilityWeight * plausibilityScore -
                CANONICAL_DELIBERATION_WEIGHTS.refutationPenaltyWeight * refutingRatio;
            // If validity is 0.0 (e.g. MUST_NOT violated), combinedConfidence is 0.0
            if (validityScore === 0.0) {
                combinedConfidence = 0.0;
            }
            combinedConfidence = Math.max(0.0, Math.min(1.0, Math.round(combinedConfidence * 10000) / 10000));
            // Determine next status
            let nextStatus = rawHypo.status;
            let statusReason;
            if (evalResult.violatedConstraintIds.length > 0 && validityScore === 0.0) {
                nextStatus = 'CONTRADICTED';
                statusReason = `Violated symbolic constraints: ${evalResult.violatedConstraintIds.join(', ')}`;
            }
            else if (refuting.length > supporting.length && refuting.length >= 2) {
                nextStatus = 'REFUTED';
                statusReason = `Refuting evidence count (${refuting.length}) exceeded supporting evidence (${supporting.length})`;
            }
            else if (combinedConfidence >= convergenceThreshold && evalResult.violatedConstraintIds.length === 0) {
                nextStatus = 'SUPPORTED';
                statusReason = `Confidence ${combinedConfidence} exceeds convergence threshold ${convergenceThreshold}`;
            }
            else {
                nextStatus = 'VALIDATING';
                statusReason = `Inconclusive confidence ${combinedConfidence}`;
            }
            // Transition hypothesis
            let updatedHypo = rawHypo;
            if (rawHypo.status !== nextStatus) {
                try {
                    if (rawHypo.status === 'PROPOSED' && nextStatus === 'SUPPORTED') {
                        const validatingHypo = this.hypothesisEngine.transitionHypothesis(rawHypo, 'VALIDATING', {
                            statusReason: 'Initiating validation evaluation',
                        });
                        updatedHypo = this.hypothesisEngine.transitionHypothesis(validatingHypo, nextStatus, {
                            statusReason,
                            validityScore,
                            combinedConfidence,
                            satisfiedConstraintIds: evalResult.satisfiedConstraintIds,
                            violatedConstraintIds: evalResult.violatedConstraintIds,
                        });
                    }
                    else {
                        updatedHypo = this.hypothesisEngine.transitionHypothesis(rawHypo, nextStatus, {
                            statusReason,
                            validityScore,
                            combinedConfidence,
                            satisfiedConstraintIds: evalResult.satisfiedConstraintIds,
                            violatedConstraintIds: evalResult.violatedConstraintIds,
                        });
                    }
                }
                catch {
                    // If direct transition is not valid from current state, update scores on current
                    updatedHypo = Object.freeze({
                        ...rawHypo,
                        validityScore,
                        combinedConfidence,
                        satisfiedConstraintIds: evalResult.satisfiedConstraintIds,
                        violatedConstraintIds: evalResult.violatedConstraintIds,
                    });
                }
            }
            else {
                updatedHypo = Object.freeze({
                    ...rawHypo,
                    validityScore,
                    combinedConfidence,
                    satisfiedConstraintIds: evalResult.satisfiedConstraintIds,
                    violatedConstraintIds: evalResult.violatedConstraintIds,
                });
            }
            evaluated.push(updatedHypo);
        }
        // Deterministic ranking & tie-breaking:
        // 1. Highest combinedConfidence
        // 2. Highest count of verified supporting evidence
        // 3. Lowest count of refuting evidence
        // 4. Lexicographical by createdAt
        // 5. Lexicographical by hypothesisId
        const sorted = [...evaluated].sort((a, b) => {
            if (b.combinedConfidence !== a.combinedConfidence) {
                return b.combinedConfidence - a.combinedConfidence;
            }
            const aVerified = a.supportingEvidenceIds.filter((id) => {
                const ev = evidenceBindings.find((e) => e.evidenceId === id);
                return ev?.isEmpiricallyVerified;
            }).length;
            const bVerified = b.supportingEvidenceIds.filter((id) => {
                const ev = evidenceBindings.find((e) => e.evidenceId === id);
                return ev?.isEmpiricallyVerified;
            }).length;
            if (bVerified !== aVerified) {
                return bVerified - aVerified;
            }
            if (a.refutingEvidenceIds.length !== b.refutingEvidenceIds.length) {
                return a.refutingEvidenceIds.length - b.refutingEvidenceIds.length;
            }
            if (a.createdAt !== b.createdAt) {
                return a.createdAt.localeCompare(b.createdAt);
            }
            return a.hypothesisId.localeCompare(b.hypothesisId);
        });
        const topHypotheses = sorted.slice(0, 5);
        const leader = sorted.length > 0 ? sorted[0] : null;
        const isConverged = leader !== null &&
            leader.status === 'SUPPORTED' &&
            leader.combinedConfidence >= convergenceThreshold &&
            leader.violatedConstraintIds.length === 0;
        const isExhausted = !isConverged;
        return Object.freeze({
            evaluatedHypotheses: Object.freeze(sorted),
            topHypotheses: Object.freeze(topHypotheses),
            winningHypothesis: isConverged ? leader : null,
            contradictions: Object.freeze(allContradictions),
            isConverged,
            isExhausted,
            iterationsRun: iterations,
        });
    }
}
export const globalDeliberationSearchEngine = new DeliberationSearchEngine();
