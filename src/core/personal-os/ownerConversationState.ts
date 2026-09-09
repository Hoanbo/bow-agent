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

import {
  OwnerConversationState,
} from './personalOsTypes';

export class OwnerConversationStateManager {
  private state: OwnerConversationState;

  constructor(initialState?: Partial<OwnerConversationState>) {
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
  public updateFocus(topic?: string, intent?: string): void {
    if (topic !== undefined) this.state.currentTopic = topic;
    if (intent !== undefined) this.state.ownerIntent = intent;
    this.state.lastInteractionTimestamp = Date.now();
  }

  /**
   * Bind conversation to an active project/goal/task hierarchy.
   */
  public bindContext(context: {
    projectId?: string;
    goalId?: string;
    taskId?: string;
    decision?: string;
  }): void {
    if (context.projectId !== undefined) this.state.activeProjectId = context.projectId;
    if (context.goalId !== undefined) this.state.activeGoalId = context.goalId;
    if (context.taskId !== undefined) this.state.activeTaskId = context.taskId;
    if (context.decision !== undefined) this.state.currentDecision = context.decision;
    this.state.lastInteractionTimestamp = Date.now();
  }

  /**
   * Add an open question awaiting Master Owner clarification.
   */
  public addOpenQuestion(question: string): void {
    if (!this.state.openQuestions.includes(question)) {
      this.state.openQuestions.push(question);
    }
    this.state.lastInteractionTimestamp = Date.now();
  }

  /**
   * Resolve an open question.
   */
  public resolveQuestion(questionText: string): void {
    this.state.openQuestions = this.state.openQuestions.filter((q) => !q.includes(questionText));
  }

  /**
   * Add an unresolved problem discussed in conversation.
   */
  public addUnresolvedProblem(problem: string): void {
    if (!this.state.unresolvedProblems.includes(problem)) {
      this.state.unresolvedProblems.push(problem);
    }
  }

  /**
   * Resolve a problem.
   */
  public resolveProblem(problemText: string): void {
    this.state.unresolvedProblems = this.state.unresolvedProblems.filter((p) => !p.includes(problemText));
  }

  /**
   * Retrieve immutable snapshot of current conversation state.
   */
  public getSnapshot(): Readonly<OwnerConversationState> {
    return {
      ...this.state,
      openQuestions: [...this.state.openQuestions],
      unresolvedProblems: [...this.state.unresolvedProblems],
    };
  }

  /**
   * Reset conversation state (e.g. at session boundary).
   */
  public reset(): void {
    this.state = {
      openQuestions: [],
      unresolvedProblems: [],
      lastInteractionTimestamp: Date.now(),
    };
  }
}
