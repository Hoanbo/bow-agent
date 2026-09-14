// src/core/deliberation/contradictionResolver.ts
// BOWCON V4.0 — MS-1.5.05: CONTRADICTION RESOLVER
// Component 1024 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// DELIBERATION != AUTHORIZATION
// DELIBERATION != EXECUTION
// HYPOTHESIS != FACT
// EVIDENCE != PROOF
// VECTOR MATCH != TRUTH
// FAIL_CLOSED_ON_CONTRADICTION == TRUE
// USER_STOP > ALL MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
import { DELIBERATION_BOUNDS, DeliberationUserStopError, DeliberationCapacityError, } from './deliberationTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class ContradictionResolver {
    userStopProvider;
    constructor(options) {
        this.userStopProvider =
            options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * Scans hypotheses, constraints, and evidence for contradictions across all 6 canonical categories.
     * Fails closed: does not silently mutate, delete, or rewrite evidence/hypotheses.
     */
    detectAndAnalyze(hypotheses, constraints, evidenceBindings, targetGoalId) {
        // 1. Synchronous USER_STOP check
        if (this.userStopProvider()) {
            throw new DeliberationUserStopError('contradiction_analysis');
        }
        const contradictions = [];
        // Capacity guard
        if (hypotheses.length > DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION) {
            throw new DeliberationCapacityError(hypotheses.length, DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION, 'hypotheses in contradiction analysis');
        }
        // Category 1: CONSTRAINT_CONTRADICTION (Mutually exclusive active constraints)
        this.detectConstraintContradictions(constraints, contradictions);
        // Category 2: EVIDENCE_CONTRADICTION (Conflicting evidence statements)
        this.detectEvidenceContradictions(evidenceBindings, contradictions);
        // Category 3: LOGICAL_CONTRADICTION (Opposing active hypotheses)
        this.detectLogicalContradictions(hypotheses, contradictions);
        // Category 4: GOAL_CONTRADICTION (Hypothesis contradicts governed target goal)
        if (targetGoalId) {
            this.detectGoalContradictions(hypotheses, targetGoalId, contradictions);
        }
        // Category 5: RESOURCE_CONTRADICTION (Conflicting resource allocations)
        this.detectResourceContradictions(hypotheses, contradictions);
        // Category 6: POLICY_CONTRADICTION (Hypothesis breaches core policy e.g. protected workspace)
        this.detectPolicyContradictions(hypotheses, contradictions);
        // Bounded check
        const boundedContradictions = contradictions.slice(0, DELIBERATION_BOUNDS.MAX_CONTRADICTIONS_PER_SESSION);
        const hasCritical = boundedContradictions.some((c) => c.severity === 'CRITICAL');
        const unresolved = boundedContradictions.filter((c) => c.severity === 'CRITICAL');
        const resolvable = boundedContradictions.filter((c) => c.severity !== 'CRITICAL');
        // Canonical rule: Critical unresolved contradiction mandates human review
        const requiresHumanReview = hasCritical || unresolved.length > 0;
        let rationale = 'No contradictions detected.';
        if (boundedContradictions.length > 0) {
            const summary = boundedContradictions.map((c) => `[${c.category}] ${c.explanation}`).join('; ');
            rationale = `Contradictions detected (${boundedContradictions.length}): ${summary}`;
        }
        return Object.freeze({
            contradictions: Object.freeze(boundedContradictions),
            hasCriticalContradiction: hasCritical,
            requiresHumanReview,
            resolvableContradictions: Object.freeze(resolvable),
            unresolvedContradictions: Object.freeze(unresolved),
            rationale,
        });
    }
    detectConstraintContradictions(constraints, out) {
        const active = constraints.filter((c) => c.active);
        for (let i = 0; i < active.length; i++) {
            for (let j = i + 1; j < active.length; j++) {
                const c1 = active[i];
                const c2 = active[j];
                // Opposing MUST vs MUST_NOT on the exact same predicate
                if ((c1.polarity === 'MUST' && c2.polarity === 'MUST_NOT' && c1.predicate === c2.predicate) ||
                    (c1.polarity === 'MUST_NOT' && c2.polarity === 'MUST' && c1.predicate === c2.predicate)) {
                    out.push({
                        contradictionId: `contra_constraint_${c1.constraintId}_${c2.constraintId}`,
                        category: 'CONSTRAINT_CONTRADICTION',
                        entityIdA: c1.constraintId,
                        entityIdB: c2.constraintId,
                        explanation: `Mutually exclusive constraints: '${c1.constraintId}' (${c1.polarity}) conflicts with '${c2.constraintId}' (${c2.polarity}) on predicate '${c1.predicate}'`,
                        severity: 'CRITICAL',
                        detectedAt: new Date().toISOString(),
                    });
                }
            }
        }
    }
    detectEvidenceContradictions(evidence, out) {
        for (let i = 0; i < evidence.length; i++) {
            for (let j = i + 1; j < evidence.length; j++) {
                const e1 = evidence[i];
                const e2 = evidence[j];
                const s1 = e1.statement.toLowerCase().trim();
                const s2 = e2.statement.toLowerCase().trim();
                const isNegation = s1 === `not ${s2}` ||
                    s2 === `not ${s1}` ||
                    s1 === `!${s2}` ||
                    s2 === `!${s1}` ||
                    (s1.includes('is true') && s2.includes('is false') && s1.replace('is true', '') === s2.replace('is false', ''));
                if (isNegation) {
                    // If one is empirically verified and the other is advisory, verified takes precedence (resolvable)
                    // If both are empirically verified with opposing facts -> CRITICAL
                    const bothVerified = e1.isEmpiricallyVerified && e2.isEmpiricallyVerified;
                    out.push({
                        contradictionId: `contra_ev_${e1.evidenceId}_${e2.evidenceId}`,
                        category: 'EVIDENCE_CONTRADICTION',
                        entityIdA: e1.evidenceId,
                        entityIdB: e2.evidenceId,
                        explanation: `Direct evidence contradiction between '${e1.evidenceId}' and '${e2.evidenceId}'`,
                        severity: bothVerified ? 'CRITICAL' : 'HIGH',
                        detectedAt: new Date().toISOString(),
                    });
                }
            }
        }
    }
    detectLogicalContradictions(hypotheses, out) {
        for (let i = 0; i < hypotheses.length; i++) {
            for (let j = i + 1; j < hypotheses.length; j++) {
                const h1 = hypotheses[i];
                const h2 = hypotheses[j];
                // Opposing claims or mutually exclusive assertions
                const t1 = h1.title.toLowerCase();
                const t2 = h2.title.toLowerCase();
                if ((t1.includes('enable') && t2.includes('disable') && t1.replace('enable', '') === t2.replace('disable', '')) ||
                    (t1.includes('allow') && t2.includes('prohibit') && t1.replace('allow', '') === t2.replace('prohibit', ''))) {
                    out.push({
                        contradictionId: `contra_logic_${h1.hypothesisId}_${h2.hypothesisId}`,
                        category: 'LOGICAL_CONTRADICTION',
                        entityIdA: h1.hypothesisId,
                        entityIdB: h2.hypothesisId,
                        explanation: `Mutually exclusive hypotheses: '${h1.title}' vs '${h2.title}'`,
                        severity: 'HIGH',
                        detectedAt: new Date().toISOString(),
                    });
                }
            }
        }
    }
    detectGoalContradictions(hypotheses, targetGoalId, out) {
        for (const h of hypotheses) {
            const text = `${h.title} ${h.premise} ${h.predictedOutcome}`.toLowerCase();
            if (text.includes('abort goal') || text.includes('contradicts goal') || text.includes('subvert goal')) {
                out.push({
                    contradictionId: `contra_goal_${h.hypothesisId}_${targetGoalId}`,
                    category: 'GOAL_CONTRADICTION',
                    entityIdA: h.hypothesisId,
                    entityIdB: targetGoalId,
                    explanation: `Hypothesis '${h.hypothesisId}' explicitly contradicts governed goal '${targetGoalId}'`,
                    severity: 'CRITICAL',
                    detectedAt: new Date().toISOString(),
                });
            }
        }
    }
    detectResourceContradictions(hypotheses, out) {
        for (let i = 0; i < hypotheses.length; i++) {
            for (let j = i + 1; j < hypotheses.length; j++) {
                const h1 = hypotheses[i];
                const h2 = hypotheses[j];
                const text1 = `${h1.premise} ${h1.predictedOutcome}`.toLowerCase();
                const text2 = `${h2.premise} ${h2.predictedOutcome}`.toLowerCase();
                if (text1.includes('exclusive_lock:port') && text2.includes('exclusive_lock:port')) {
                    out.push({
                        contradictionId: `contra_res_${h1.hypothesisId}_${h2.hypothesisId}`,
                        category: 'RESOURCE_CONTRADICTION',
                        entityIdA: h1.hypothesisId,
                        entityIdB: h2.hypothesisId,
                        explanation: `Resource clash: competing exclusive lock claims between hypotheses '${h1.hypothesisId}' and '${h2.hypothesisId}'`,
                        severity: 'CRITICAL',
                        detectedAt: new Date().toISOString(),
                    });
                }
            }
        }
    }
    detectPolicyContradictions(hypotheses, out) {
        for (const h of hypotheses) {
            const text = `${h.title} ${h.premise} ${h.predictedOutcome}`.toLowerCase();
            if (text.includes('shopofbow') ||
                text.includes('c:\\bow\\shopofbow') ||
                text.includes('[protected_workspace_path]') ||
                text.includes('[redacted_protected_workspace]') ||
                text.includes('bypass_governance') ||
                text.includes('ignore_user_stop')) {
                out.push({
                    contradictionId: `contra_policy_${h.hypothesisId}`,
                    category: 'POLICY_CONTRADICTION',
                    entityIdA: h.hypothesisId,
                    entityIdB: 'GOVERNANCE_POLICY',
                    explanation: `Hypothesis '${h.hypothesisId}' directly breaches governance policy (e.g. protected workspace or user stop bypass)`,
                    severity: 'CRITICAL',
                    detectedAt: new Date().toISOString(),
                });
            }
        }
    }
}
export const globalContradictionResolver = new ContradictionResolver();
