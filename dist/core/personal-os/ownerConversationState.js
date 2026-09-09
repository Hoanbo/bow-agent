// src/core/personal-os/ownerConversationState.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Section 15: Owner Conversation State Manager
// Maintains structured conversation context across turns and sessions.
// Distinguishes topic, project, goal, task, decision, open question, and intent.
//
// Invariants:
// - Never treat raw chat logs as an unstructured memory dump.
// - Explicitly track open questions and unresolved problems.
// - Grounded in single Master Owner authority.
export class OwnerConversationStateManager {
    state;
    constructor(initialState) {
        this.state = {
            currentTopic: initialState?.currentTopic,
            activeProjectId: initialState?.activeProjectId,
            activeGoalId: initialState?.activeGoalId,
            activeTaskId: initialState?.activeTaskId,
            currentDecision: initialState?.currentDecision,
            openQuestions: initialState?.openQuestions ?? [],
            unresolvedProblems: initialState?.unresolvedProblems ?? [],
            ownerIntent: initialState?.ownerIntent,
            lastInteractionTimestamp: initialState?.lastInteractionTimestamp ?? Date.now(),
        };
    }
    /**
     * Update conversation focus topic and intent.
     */
    updateFocus(topic, intent) {
        if (topic !== undefined)
            this.state.currentTopic = topic;
        if (intent !== undefined)
            this.state.ownerIntent = intent;
        this.state.lastInteractionTimestamp = Date.now();
    }
    /**
     * Bind conversation to an active project/goal/task hierarchy.
     */
    bindContext(context) {
        if (context.projectId !== undefined)
            this.state.activeProjectId = context.projectId;
        if (context.goalId !== undefined)
            this.state.activeGoalId = context.goalId;
        if (context.taskId !== undefined)
            this.state.activeTaskId = context.taskId;
        if (context.decision !== undefined)
            this.state.currentDecision = context.decision;
        this.state.lastInteractionTimestamp = Date.now();
    }
    /**
     * Add an open question awaiting Master Owner clarification.
     */
    addOpenQuestion(question) {
        if (!this.state.openQuestions.includes(question)) {
            this.state.openQuestions.push(question);
        }
        this.state.lastInteractionTimestamp = Date.now();
    }
    /**
     * Resolve an open question.
     */
    resolveQuestion(questionText) {
        this.state.openQuestions = this.state.openQuestions.filter((q) => !q.includes(questionText));
    }
    /**
     * Add an unresolved problem discussed in conversation.
     */
    addUnresolvedProblem(problem) {
        if (!this.state.unresolvedProblems.includes(problem)) {
            this.state.unresolvedProblems.push(problem);
        }
    }
    /**
     * Resolve a problem.
     */
    resolveProblem(problemText) {
        this.state.unresolvedProblems = this.state.unresolvedProblems.filter((p) => !p.includes(problemText));
    }
    /**
     * Retrieve immutable snapshot of current conversation state.
     */
    getSnapshot() {
        return {
            ...this.state,
            openQuestions: [...this.state.openQuestions],
            unresolvedProblems: [...this.state.unresolvedProblems],
        };
    }
    /**
     * Reset conversation state (e.g. at session boundary).
     */
    reset() {
        this.state = {
            openQuestions: [],
            unresolvedProblems: [],
            lastInteractionTimestamp: Date.now(),
        };
    }
}
