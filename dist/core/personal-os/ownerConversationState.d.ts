import { OwnerConversationState } from './personalOsTypes';
export declare class OwnerConversationStateManager {
    private state;
    constructor(initialState?: Partial<OwnerConversationState>);
    /**
     * Update conversation focus topic and intent.
     */
    updateFocus(topic?: string, intent?: string): void;
    /**
     * Bind conversation to an active project/goal/task hierarchy.
     */
    bindContext(context: {
        projectId?: string;
        goalId?: string;
        taskId?: string;
        decision?: string;
    }): void;
    /**
     * Add an open question awaiting Master Owner clarification.
     */
    addOpenQuestion(question: string): void;
    /**
     * Resolve an open question.
     */
    resolveQuestion(questionText: string): void;
    /**
     * Add an unresolved problem discussed in conversation.
     */
    addUnresolvedProblem(problem: string): void;
    /**
     * Resolve a problem.
     */
    resolveProblem(problemText: string): void;
    /**
     * Retrieve immutable snapshot of current conversation state.
     */
    getSnapshot(): Readonly<OwnerConversationState>;
    /**
     * Reset conversation state (e.g. at session boundary).
     */
    reset(): void;
}
