import { type GoalProposalInput, type GovernedGoal, type GoalPriorityVector } from './goalTypes.js';
export declare class GoalValidator {
    /**
     * Validates an untrusted GoalProposalInput.
     * Fails closed on any schema, boundary, CoT, or security violation.
     */
    static validateProposal(proposal: unknown): asserts proposal is GoalProposalInput;
    /**
     * Validates a constructed GovernedGoal.
     */
    static validateGoal(goal: GovernedGoal): void;
    /**
     * Validates priority vector dimensions bounds strictly [0.0, 1.0].
     */
    static sanitizePriorityVector(input?: Partial<GoalPriorityVector>): GoalPriorityVector;
}
