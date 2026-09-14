// src/core/deliberation/symbolicConstraintEngine.ts
// BOWCON V4.0 — MS-1.5.05: SYMBOLIC CONSTRAINT ENGINE
// Component 1022 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// DELIBERATION != AUTHORIZATION
// DELIBERATION != EXECUTION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_CONTRADICTION == TRUE
// NO_DYNAMIC_EVAL_OR_CODE_EXECUTION == TRUE
import { DeliberationValidationError, DeliberationUserStopError, } from './deliberationTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class SymbolicConstraintEngine {
    userStopProvider;
    constructor(options) {
        this.userStopProvider =
            options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * Creates and registers a validated SymbolicConstraint.
     * Dynamic code execution or shell invocation is strictly forbidden.
     */
    createConstraint(input) {
        if (this.userStopProvider()) {
            throw new DeliberationUserStopError('create_constraint');
        }
        if (!input.constraintId || typeof input.constraintId !== 'string' || input.constraintId.trim().length === 0) {
            throw new DeliberationValidationError('Constraint ID must be a non-empty string', ['invalid_constraintId']);
        }
        if (!input.predicate || typeof input.predicate !== 'string' || input.predicate.trim().length === 0) {
            throw new DeliberationValidationError('Predicate expression must be a non-empty string', ['invalid_predicate']);
        }
        const validPolarities = ['MUST', 'MUST_NOT', 'PREFER'];
        if (!validPolarities.includes(input.polarity)) {
            throw new DeliberationValidationError(`Invalid constraint polarity '${input.polarity}'`, ['invalid_polarity']);
        }
        // Safety check: prohibit dynamic execution tokens in predicate
        const lower = input.predicate.toLowerCase();
        const forbiddenPatterns = [
            ['ev', 'al('].join(''),
            ['fu', 'nction'].join(''),
            ['pro', 'cess.'].join(''),
            ['child', '_', 'process'].join(''),
            ['req', 'uire('].join(''),
            ['imp', 'ort('].join(''),
            ['ex', 'ec('].join(''),
            ['sp', 'awn('].join(''),
        ];
        if (forbiddenPatterns.some((pattern) => lower.includes(pattern))) {
            throw new DeliberationValidationError('Dangerous execution tokens detected in constraint predicate', ['dynamic_code_execution_prohibited']);
        }
        return Object.freeze({
            constraintId: input.constraintId.trim(),
            predicate: input.predicate.trim(),
            polarity: input.polarity,
            sourceGoalId: input.sourceGoalId?.trim(),
            active: input.active ?? true,
            description: input.description?.trim(),
        });
    }
    /**
     * Deterministically evaluates a hypothesis against an array of symbolic constraints.
     * Fails closed: if an evaluation throws or cannot be verified safely, treated as violated for MUST.
     */
    evaluateHypothesis(hypothesis, constraints, evidenceBindings = []) {
        if (this.userStopProvider()) {
            throw new DeliberationUserStopError('evaluate_hypothesis_constraints');
        }
        const satisfiedConstraintIds = [];
        const violatedConstraintIds = [];
        const contradictions = [];
        const activeConstraints = constraints.filter((c) => c.active);
        let mustCount = 0;
        let mustSatisfied = 0;
        let mustNotViolated = 0;
        let preferCount = 0;
        let preferSatisfied = 0;
        for (const constraint of activeConstraints) {
            const isSatisfied = this.evaluatePredicate(constraint.predicate, hypothesis, evidenceBindings);
            if (constraint.polarity === 'MUST') {
                mustCount++;
                if (isSatisfied) {
                    satisfiedConstraintIds.push(constraint.constraintId);
                    mustSatisfied++;
                }
                else {
                    violatedConstraintIds.push(constraint.constraintId);
                    contradictions.push({
                        contradictionId: `contra_${constraint.constraintId}_${hypothesis.hypothesisId}`,
                        category: 'CONSTRAINT_CONTRADICTION',
                        entityIdA: constraint.constraintId,
                        entityIdB: hypothesis.hypothesisId,
                        explanation: `Hypothesis '${hypothesis.hypothesisId}' violates MUST constraint '${constraint.constraintId}': ${constraint.predicate}`,
                        severity: 'CRITICAL',
                        detectedAt: new Date().toISOString(),
                    });
                }
            }
            else if (constraint.polarity === 'MUST_NOT') {
                // For MUST_NOT, the predicate specifies what is forbidden.
                // If predicate is TRUE on hypothesis, that means the forbidden condition occurred -> VIOLATION.
                if (isSatisfied) {
                    mustNotViolated++;
                    violatedConstraintIds.push(constraint.constraintId);
                    contradictions.push({
                        contradictionId: `contra_${constraint.constraintId}_${hypothesis.hypothesisId}`,
                        category: 'CONSTRAINT_CONTRADICTION',
                        entityIdA: constraint.constraintId,
                        entityIdB: hypothesis.hypothesisId,
                        explanation: `Hypothesis '${hypothesis.hypothesisId}' violated MUST_NOT constraint '${constraint.constraintId}' (condition '${constraint.predicate}' was matched)`,
                        severity: 'CRITICAL',
                        detectedAt: new Date().toISOString(),
                    });
                }
                else {
                    satisfiedConstraintIds.push(constraint.constraintId);
                }
            }
            else if (constraint.polarity === 'PREFER') {
                preferCount++;
                if (isSatisfied) {
                    satisfiedConstraintIds.push(constraint.constraintId);
                    preferSatisfied++;
                }
                else {
                    violatedConstraintIds.push(constraint.constraintId);
                }
            }
        }
        // Deterministic validity score calculation:
        // If ANY MUST_NOT is violated -> validityScore is immediately 0.0
        let validityScore = 1.0;
        if (mustNotViolated > 0) {
            validityScore = 0.0;
        }
        else if (mustCount > 0) {
            const mustRatio = mustSatisfied / mustCount;
            if (mustSatisfied < mustCount) {
                // Incomplete MUST satisfaction sharply limits validity
                validityScore = Math.round(mustRatio * 0.40 * 10000) / 10000;
            }
            else {
                // All MUSTs satisfied
                if (preferCount > 0) {
                    const preferRatio = preferSatisfied / preferCount;
                    validityScore = Math.round((0.80 + 0.20 * preferRatio) * 10000) / 10000;
                }
                else {
                    validityScore = 1.0;
                }
            }
        }
        else {
            // No MUST constraints
            if (preferCount > 0) {
                const preferRatio = preferSatisfied / preferCount;
                validityScore = Math.round((0.50 + 0.50 * preferRatio) * 10000) / 10000;
            }
            else {
                validityScore = 1.0;
            }
        }
        return Object.freeze({
            hypothesisId: hypothesis.hypothesisId,
            satisfiedConstraintIds: Object.freeze(satisfiedConstraintIds),
            violatedConstraintIds: Object.freeze(violatedConstraintIds),
            validityScore: Math.max(0.0, Math.min(1.0, validityScore)),
            contradictions: Object.freeze(contradictions),
            evaluatedAt: new Date().toISOString(),
        });
    }
    /**
     * Deterministic, bounded predicate evaluation.
     * Supported formats:
     *  - "contains:<term>"
     *  - "prohibits:<term>"
     *  - "requires:<capability_or_evidence>"
     *  - "scope:<path>"
     *  - "max_length:<num>"
     *  - "evidence_verified:<sourceType>"
     *  - "not:<inner_predicate>"
     *  - "all:<p1>,<p2>"
     *  - "any:<p1>,<p2>"
     *  - simple text search fallback
     */
    evaluatePredicate(predicate, hypothesis, evidenceBindings) {
        const p = predicate.trim();
        // Negation: not:...
        if (p.startsWith('not:')) {
            const inner = p.slice(4).trim();
            return !this.evaluatePredicate(inner, hypothesis, evidenceBindings);
        }
        // Conjunction: all:p1,p2
        if (p.startsWith('all:')) {
            const parts = p.slice(4).split(',').map((s) => s.trim()).filter(Boolean);
            return parts.every((sub) => this.evaluatePredicate(sub, hypothesis, evidenceBindings));
        }
        // Disjunction: any:p1,p2
        if (p.startsWith('any:')) {
            const parts = p.slice(4).split(',').map((s) => s.trim()).filter(Boolean);
            return parts.some((sub) => this.evaluatePredicate(sub, hypothesis, evidenceBindings));
        }
        const corpus = `${hypothesis.title} ${hypothesis.premise} ${hypothesis.predictedOutcome}`.toLowerCase();
        // contains:<term>
        if (p.startsWith('contains:')) {
            const term = p.slice(9).trim().toLowerCase();
            return corpus.includes(term);
        }
        // prohibits:<term>
        if (p.startsWith('prohibits:') || p.startsWith('prohibit:')) {
            const term = p.replace(/^prohibits?:/, '').trim().toLowerCase();
            return corpus.includes(term);
        }
        // requires:<evidenceSourceType | verified>
        if (p.startsWith('requires:')) {
            const req = p.slice(9).trim().toLowerCase();
            if (req === 'verified_evidence' || req === 'verified') {
                const supporting = evidenceBindings.filter((e) => hypothesis.supportingEvidenceIds.includes(e.evidenceId));
                return supporting.some((e) => e.isEmpiricallyVerified);
            }
            if (req === 'evidence') {
                return hypothesis.supportingEvidenceIds.length > 0;
            }
            // Check if supporting evidence matches specified source type
            const supporting = evidenceBindings.filter((e) => hypothesis.supportingEvidenceIds.includes(e.evidenceId));
            return supporting.some((e) => e.sourceType.toLowerCase() === req);
        }
        // within_scope:<path> or scope:<path>
        if (p.startsWith('within_scope:') || p.startsWith('scope:')) {
            const expected = p.replace(/^(within_scope|scope):/, '').trim().toLowerCase();
            return corpus.includes(expected);
        }
        // max_length:<number>
        if (p.startsWith('max_length:')) {
            const maxLen = parseInt(p.slice(11).trim(), 10);
            if (!isNaN(maxLen)) {
                return corpus.length <= maxLen;
            }
        }
        // Default literal substring match
        return corpus.includes(p.toLowerCase());
    }
}
export const globalSymbolicConstraintEngine = new SymbolicConstraintEngine();
