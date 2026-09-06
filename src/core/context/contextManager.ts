// src/core/context/contextManager.ts
// BOWCON V4.0 — CENTRAL CONTEXT MANAGER ORCHESTRATION (MILESTONE 1.3.7)
//
// Invariants:
// - INV-1 & INV-2: Strict user & session partition isolation.
// - INV-11: Text and snapshot immutability (defensive copies).
// - INV-14: Failure isolation: Graceful fallback to minimal snapshot without crashing agent.
// - INV-12: Governance compatible: Context is informational and does not bypass PDP/approvals.

import {
  ConversationTurn,
  ContextItem,
  ContextReference,
  ConversationContextSnapshot,
  ContextConfig,
  DEFAULT_CONTEXT_CONFIG,
  validateContextConfig,
} from './conversationContext.js';
import { ContextStore, globalContextStore } from './contextStore.js';
import { extractContextItems } from './contextClassifier.js';
import { TopicTracker, TopicState, globalTopicTracker } from './topicTracker.js';
import { ReferenceResolver, globalReferenceResolver } from './referenceResolver.js';
import { ContextRanker, globalContextRanker } from './contextRanker.js';
import { ContextCompactor, globalContextCompactor } from './contextCompactor.js';

export class ContextManager {
  private store: ContextStore;
  private topicTracker: TopicTracker;
  private referenceResolver: ReferenceResolver;
  private ranker: ContextRanker;
  private compactor: ContextCompactor;
  private config: Required<ContextConfig>;
  private topicStates = new Map<string, TopicState>();

  constructor(
    customStore?: ContextStore,
    customConfig?: ContextConfig
  ) {
    this.store = customStore || globalContextStore;
    this.topicTracker = globalTopicTracker;
    this.referenceResolver = globalReferenceResolver;
    this.ranker = globalContextRanker;
    this.compactor = globalContextCompactor;

    if (customConfig) {
      const val = validateContextConfig(customConfig);
      this.config = val.valid && val.config ? val.config : { ...DEFAULT_CONTEXT_CONFIG };
    } else {
      this.config = { ...DEFAULT_CONTEXT_CONFIG };
    }
  }

  public getStore(): ContextStore {
    return this.store;
  }

  public getConfig(): Required<ContextConfig> {
    return { ...this.config };
  }

  /**
   * Ingests a new user conversation turn, updating topic, references, items, and running compaction.
   */
  public async ingestUserTurn(
    userId: string,
    sessionId: string,
    userText: string
  ): Promise<{
    turn: ConversationTurn;
    items: ContextItem[];
    topicState: TopicState;
    references: ContextReference[];
  }> {
    const timestamp = new Date().toISOString();
    const turnId = `turn_u_${Date.now()}`;
    const turn: ConversationTurn = {
      id: turnId,
      sender: 'user',
      content: String(userText),
      timestamp,
    };

    // 1. Topic tracking (INV-8)
    const partitionKey = this.store.buildPartitionKey(userId, sessionId);
    const existingTopic = this.topicStates.get(partitionKey);
    const topicState = this.topicTracker.updateTopic(existingTopic, userText, turnId);
    this.topicStates.set(partitionKey, topicState);

    // 2. Reference resolution (INV-9)
    const recentTurns = this.store.getRecentTurns(userId, sessionId, 10);
    const references = this.referenceResolver.resolveReferences(userText, recentTurns);

    // 3. Classification and Item Extraction (INV-4, INV-5)
    const items = extractContextItems(turn, topicState.activeTopic);

    // 4. Persistence into scoped store (INV-1, INV-2)
    this.store.appendTurn(userId, sessionId, turn, items);

    // 5. Automatic compaction if thresholds reached (INV-6, INV-7)
    const allTurns = this.store.getAllTurns(userId, sessionId);
    const allItems = this.store.getItems(userId, sessionId);

    if (this.compactor.needsCompaction(allTurns, this.config)) {
      const compactionResult = this.compactor.compactTurns(allTurns, allItems, this.config);
      this.store.replaceCompactedContext(
        userId,
        sessionId,
        compactionResult.compactedTurns,
        compactionResult.compactionState
      );
    }

    return { turn, items, topicState, references };
  }

  /**
   * Commits the agent's response turn at Stage 7 of the AgentLoop.
   */
  public async commitAgentResponse(
    userId: string,
    sessionId: string,
    responseText: string,
    metadata?: Record<string, any>
  ): Promise<ConversationTurn> {
    const turnId = `turn_a_${Date.now()}`;
    const turn: ConversationTurn = {
      id: turnId,
      sender: 'agent',
      content: String(responseText),
      timestamp: new Date().toISOString(),
      metadata,
    };

    const partitionKey = this.store.buildPartitionKey(userId, sessionId);
    const topicState = this.topicStates.get(partitionKey);
    const items = extractContextItems(turn, topicState?.activeTopic);

    this.store.appendTurn(userId, sessionId, turn, items);
    return turn;
  }

  /**
   * Generates a deterministic, immutable snapshot of the current conversational context.
   */
  public getContextSnapshot(userId: string, sessionId: string): ConversationContextSnapshot {
    try {
      const partitionKey = this.store.buildPartitionKey(userId, sessionId);
      const topicState = this.topicStates.get(partitionKey) || {
        activeTopic: 'general',
        topicConfidence: 0.5,
        topicChanged: false,
      };

      const scopedContext = this.store.getOrCreateContext(userId, sessionId);
      const recentTurns = this.store.getRecentTurns(userId, sessionId, this.config.maxRecentTurns);
      const allItems = this.store.getItems(userId, sessionId);

      // Rank relevant context items
      const rankedMemories = this.ranker.rankItems(allItems, {
        activeTopic: topicState.activeTopic,
        maxItems: this.config.maxContextItems,
      });

      // Filter unresolved tasks and explicit instructions
      const unresolvedTasks = allItems
        .filter(i => i.isUnresolvedTask)
        .map(i => ({ ...i }));

      const explicitInstructions = allItems
        .filter(i => i.isExplicitInstruction)
        .map(i => ({ ...i }));

      // Resolve references on the most recent user turn
      const lastUserTurn = [...recentTurns].reverse().find(t => t.sender === 'user');
      const resolvedReferences = lastUserTurn
        ? this.referenceResolver.resolveReferences(lastUserTurn.content, recentTurns)
        : [];

      // Calculate total characters across snapshot
      const totalChars =
        recentTurns.reduce((acc, t) => acc + t.content.length, 0) +
        rankedMemories.reduce((acc, m) => acc + m.content.length, 0);

      return {
        userId: userId.trim(),
        sessionId: sessionId.trim(),
        activeTopic: topicState.activeTopic,
        previousTopic: topicState.previousTopic,
        topicConfidence: topicState.topicConfidence,
        recentTurns,
        relevantMemories: rankedMemories,
        unresolvedTasks,
        explicitInstructions,
        resolvedReferences,
        compactionState: scopedContext.compactionState ? { ...scopedContext.compactionState } : undefined,
        totalEstimatedCharacters: totalChars,
      };
    } catch (err: any) {
      // Failure Isolation (INV-14): Return safe minimal snapshot
      return {
        userId: String(userId || 'unknown'),
        sessionId: String(sessionId || 'unknown'),
        activeTopic: 'general',
        topicConfidence: 0.1,
        recentTurns: [],
        relevantMemories: [],
        unresolvedTasks: [],
        explicitInstructions: [],
        resolvedReferences: [],
        totalEstimatedCharacters: 0,
      };
    }
  }

  /**
   * Resets or clears context for a given session.
   */
  public clearSession(userId: string, sessionId: string): void {
    const partitionKey = this.store.buildPartitionKey(userId, sessionId);
    this.topicStates.delete(partitionKey);
    this.store.clearSessionContext(userId, sessionId);
  }
}

export const globalContextManager = new ContextManager();
