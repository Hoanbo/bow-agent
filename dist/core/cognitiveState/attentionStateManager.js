// src/core/cognitiveState/attentionStateManager.ts
// BOWCON V4.0 — MS-1.5.02: ATTENTION STATE MANAGER
// Component 991 — REAL
//
// Invariants:
// PRIMARY_ATTENTION_TARGET_LIMIT == 1
// SECONDARY_ATTENTION_TARGET_LIMIT == 3
// ATTENTION_STACK_DEPTH_LIMIT == 5
// BOUNDED_DETERMINISTIC_SALIENCE == TRUE
// ZERO_UNCONTROLLED_BACKGROUND_DRIFT == TRUE
import crypto from 'node:crypto';
import { MAX_SECONDARY_ATTENTION_TARGETS, MAX_ATTENTION_STACK_DEPTH, CognitiveStateValidationError, } from './cognitiveStateTypes.js';
export class AttentionStateManager {
    state;
    constructor(initialState) {
        this.state = initialState
            ? Object.freeze({
                primaryTarget: initialState.primaryTarget || null,
                secondaryTargets: Object.freeze([...(initialState.secondaryTargets || [])]),
                stack: Object.freeze([...(initialState.stack || [])]),
            })
            : Object.freeze({
                primaryTarget: null,
                secondaryTargets: Object.freeze([]),
                stack: Object.freeze([]),
            });
    }
    get currentState() {
        return this.state;
    }
    /**
     * Sets the primary attention target (strictly capped at 1).
     */
    setPrimaryTarget(target) {
        if (target) {
            this.validateTarget(target);
        }
        this.state = Object.freeze({
            ...this.state,
            primaryTarget: target ? Object.freeze({ ...target }) : null,
        });
        return this.state;
    }
    /**
     * Sets secondary attention targets (strictly capped at max 3).
     */
    setSecondaryTargets(targets) {
        if (targets.length > MAX_SECONDARY_ATTENTION_TARGETS) {
            throw new CognitiveStateValidationError(`Secondary attention targets count (${targets.length}) exceeds maximum limit of ${MAX_SECONDARY_ATTENTION_TARGETS}`, ['SECONDARY_TARGETS_OVERFLOW']);
        }
        for (const t of targets) {
            this.validateTarget(t);
        }
        this.state = Object.freeze({
            ...this.state,
            secondaryTargets: Object.freeze(targets.map((t) => Object.freeze({ ...t }))),
        });
        return this.state;
    }
    /**
     * Handles a higher-priority interruption by snapshotting the current attention frame,
     * pushing it to the bounded LIFO stack (max depth 5), and focusing on the new target.
     */
    interrupt(newTarget, interruptedBy, activePriority) {
        this.validateTarget(newTarget);
        const frame = Object.freeze({
            frameId: `attfrm_${crypto.randomBytes(4).toString('hex')}`,
            primaryTarget: this.state.primaryTarget,
            secondaryTargets: this.state.secondaryTargets,
            activePriority,
            interruptedBy: interruptedBy.trim(),
            savedAt: new Date().toISOString(),
        });
        let nextStack = [...this.state.stack, frame];
        // If stack exceeds max depth 5, drop oldest frame deterministically
        if (nextStack.length > MAX_ATTENTION_STACK_DEPTH) {
            nextStack = nextStack.slice(nextStack.length - MAX_ATTENTION_STACK_DEPTH);
        }
        this.state = Object.freeze({
            primaryTarget: Object.freeze({ ...newTarget }),
            secondaryTargets: Object.freeze([]), // Clear secondary targets during interrupt
            stack: Object.freeze(nextStack),
        });
        return this.state;
    }
    /**
     * Resumes previous attention frame by popping the top frame from the stack.
     * Returns true if a frame was resumed, or false if stack was empty.
     */
    resume() {
        if (this.state.stack.length === 0) {
            return { resumed: false, state: this.state };
        }
        const nextStack = [...this.state.stack];
        const topFrame = nextStack.pop();
        this.state = Object.freeze({
            primaryTarget: topFrame.primaryTarget ? Object.freeze({ ...topFrame.primaryTarget }) : null,
            secondaryTargets: topFrame.secondaryTargets ? Object.freeze([...topFrame.secondaryTargets]) : Object.freeze([]),
            stack: Object.freeze(nextStack),
        });
        return {
            resumed: true,
            state: this.state,
            restoredFrame: topFrame,
        };
    }
    /**
     * Clears all attention state.
     */
    clear() {
        this.state = Object.freeze({
            primaryTarget: null,
            secondaryTargets: Object.freeze([]),
            stack: Object.freeze([]),
        });
        return this.state;
    }
    /**
     * Deterministic salience calculation:
     * Salience = wr*recency + wu*userEmphasis + wk*risk + wc*constraintOverlap
     * Output normalized in range [0.0, 1.0].
     */
    static calculateSalience(factors, weights) {
        const wr = weights?.recencyWeight ?? 0.3;
        const wu = weights?.userEmphasisWeight ?? 0.35;
        const wk = weights?.riskWeight ?? 0.2;
        const wc = weights?.constraintOverlapWeight ?? 0.15;
        const raw = Math.max(0, Math.min(1, factors.recency)) * wr +
            Math.max(0, Math.min(1, factors.userEmphasis)) * wu +
            Math.max(0, Math.min(1, factors.risk)) * wk +
            Math.max(0, Math.min(1, factors.constraintOverlap)) * wc;
        const totalWeight = wr + wu + wk + wc;
        const normalized = totalWeight > 0 ? raw / totalWeight : 0;
        return Math.round(Math.max(0, Math.min(1, normalized)) * 1000) / 1000;
    }
    validateTarget(target) {
        if (!target.targetId || typeof target.targetId !== 'string') {
            throw new CognitiveStateValidationError('Attention target must have a valid targetId', ['INVALID_TARGET_ID']);
        }
        if (!target.targetValue || typeof target.targetValue !== 'string') {
            throw new CognitiveStateValidationError('Attention target must have a non-empty targetValue', ['INVALID_TARGET_VALUE']);
        }
        if (typeof target.salienceScore !== 'number' || target.salienceScore < 0 || target.salienceScore > 1) {
            throw new CognitiveStateValidationError('Attention target salienceScore must be between 0.0 and 1.0', ['INVALID_SALIENCE']);
        }
    }
}
