import { type AttentionState, type AttentionTargetDescriptor, type AttentionFrame } from './cognitiveStateTypes.js';
export interface SalienceWeights {
    readonly recencyWeight?: number;
    readonly userEmphasisWeight?: number;
    readonly riskWeight?: number;
    readonly constraintOverlapWeight?: number;
}
export declare class AttentionStateManager {
    private state;
    constructor(initialState?: AttentionState);
    get currentState(): AttentionState;
    /**
     * Sets the primary attention target (strictly capped at 1).
     */
    setPrimaryTarget(target: AttentionTargetDescriptor | null): AttentionState;
    /**
     * Sets secondary attention targets (strictly capped at max 3).
     */
    setSecondaryTargets(targets: readonly AttentionTargetDescriptor[]): AttentionState;
    /**
     * Handles a higher-priority interruption by snapshotting the current attention frame,
     * pushing it to the bounded LIFO stack (max depth 5), and focusing on the new target.
     */
    interrupt(newTarget: AttentionTargetDescriptor, interruptedBy: string, activePriority: number): AttentionState;
    /**
     * Resumes previous attention frame by popping the top frame from the stack.
     * Returns true if a frame was resumed, or false if stack was empty.
     */
    resume(): {
        readonly resumed: boolean;
        readonly state: AttentionState;
        readonly restoredFrame?: AttentionFrame;
    };
    /**
     * Clears all attention state.
     */
    clear(): AttentionState;
    /**
     * Deterministic salience calculation:
     * Salience = wr*recency + wu*userEmphasis + wk*risk + wc*constraintOverlap
     * Output normalized in range [0.0, 1.0].
     */
    static calculateSalience(factors: {
        readonly recency: number;
        readonly userEmphasis: number;
        readonly risk: number;
        readonly constraintOverlap: number;
    }, weights?: SalienceWeights): number;
    private validateTarget;
}
