import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { type AgentLoopState } from './agentLoopFacadeTypes.js';
export interface StateTransitionEvent {
    readonly fromState: AgentLoopState;
    readonly toState: AgentLoopState;
    readonly timestamp: string;
    readonly reason?: string;
}
export declare class AgentLoopStateCoordinator {
    private currentState;
    private readonly history;
    private static readonly ALLOWED_TRANSITIONS;
    /**
     * EN: Returns the current state of the agent loop.
     */
    getCurrentState(): AgentLoopState;
    /**
     * EN: Returns a copy of the transition history.
     */
    getHistory(): readonly StateTransitionEvent[];
    /**
     * EN: Validates whether a state is terminal.
     */
    isTerminal(state: AgentLoopState): boolean;
    /**
     * EN: Verifies task version concurrency freshness.
     * Throws AgentLoopConcurrencyError if current version doesn't match expected version.
     */
    verifyTaskVersion(task: AgentTask, expectedVersion: number): void;
    /**
     * EN: Transitions the loop state machine deterministically.
     */
    transitionTo(nextState: AgentLoopState, reason?: string): AgentLoopState;
    /**
     * EN: Returns the immutable history of state transitions.
     */
    getStateHistory(): readonly StateTransitionEvent[];
    /**
     * EN: Resets the state coordinator back to IDLE.
     */
    reset(): void;
}
