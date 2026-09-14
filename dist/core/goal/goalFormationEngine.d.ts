import { type GoalProposalInput, type GovernedGoal } from './goalTypes.js';
import { GoalPriorityEngine } from './goalPriorityEngine.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface GoalFormationOptions {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly priorityEngine?: GoalPriorityEngine;
    readonly userStopProvider?: () => boolean;
}
export declare class GoalFormationEngine {
    private readonly sanitizer;
    private readonly priorityEngine;
    private readonly userStopProvider;
    constructor(options?: GoalFormationOptions);
    /**
     * Transforms an untrusted GoalProposalInput into an immutable, strongly typed GovernedGoal.
     *
     * 1. Synchronously asserts USER_STOP preemption.
     * 2. Runs fails-closed GoalValidator.
     * 3. Sanitizes credentials, API keys, and sensitive paths.
     * 4. Computes deterministic priority score.
     * 5. Computes deterministic goalId and SHA-256 provenance hash.
     */
    formGoal(proposal: GoalProposalInput, customCreatedAt?: string): GovernedGoal;
    private sanitizeText;
}
export declare const globalGoalFormationEngine: GoalFormationEngine;
