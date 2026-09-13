import type { AuthorizedActionHandoff } from '../actionProposal/actionProposalTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
export declare class AuthorizedHandoffValidator {
    /**
     * Validates an AuthorizedActionHandoff envelope against authoritative task state and security bounds.
     * Throws typed ToolAdapterError subclasses fail-closed upon any validation failure.
     */
    validateHandoff(handoff: unknown, authoritativeTask?: AgentTask, currentTimeMs?: number): asserts handoff is AuthorizedActionHandoff;
    /**
     * Defensively validates argument payload against size bounds, depth limits, prototype pollution, and null bytes.
     */
    validateArgumentsDefensively(args: Record<string, unknown>): void;
    private scanRecursive;
}
export declare const globalAuthorizedHandoffValidator: AuthorizedHandoffValidator;
