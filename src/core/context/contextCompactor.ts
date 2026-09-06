// src/core/context/contextCompactor.ts
// BOWCON V4.0 — DETERMINISTIC CONTEXT COMPACTOR (MILESTONE 1.3.7)
//
// Invariants:
// - INV-6: Enforces deterministic limits for max turns and max characters.
// - INV-7: Context Compaction preserves:
//   1. Recent turns (last maxRecentTurns)
//   2. Explicit user instructions
//   3. Unresolved tasks
//   4. Active topic context
//   Compacts older low-value turns into a deterministic summary turn.
//   Purges ephemeral chatter.
//   Does NOT modify durable Boss Memory.

import {
  ConversationTurn,
  ContextItem,
  CompactionState,
  ContextConfig,
  DEFAULT_CONTEXT_CONFIG,
} from './conversationContext.js';

export interface CompactionResult {
  compactedTurns: ConversationTurn[];
  compactionState: CompactionState;
  purgedTurnCount: number;
}

export class ContextCompactor {
  /**
   * Evaluates whether a set of turns requires compaction against configured thresholds.
   */
  public needsCompaction(
    turns: ConversationTurn[],
    config: Required<ContextConfig> = DEFAULT_CONTEXT_CONFIG
  ): boolean {
    if (turns.length >= config.compactionThreshold) {
      return true;
    }
    const totalChars = turns.reduce((acc, t) => acc + (t.content ? t.content.length : 0), 0);
    return totalChars >= config.maxCharacters;
  }

  /**
   * Deterministically compacts conversation turns when thresholds are exceeded.
   */
  public compactTurns(
    turns: ConversationTurn[],
    items: ContextItem[] = [],
    config: Required<ContextConfig> = DEFAULT_CONTEXT_CONFIG
  ): CompactionResult {
    if (!this.needsCompaction(turns, config) && turns.length <= config.maxTurns) {
      return {
        compactedTurns: turns.map(t => ({ ...t })),
        compactionState: {
          compacted: false,
          originalTurnCount: turns.length,
          compactedTurnCount: turns.length,
          timestamp: new Date().toISOString(),
        },
        purgedTurnCount: 0,
      };
    }

    const originalTurnCount = turns.length;
    const maxRecent = config.maxRecentTurns;

    // 1. Separate recent turns (must be preserved intact) from older candidate turns
    const olderTurns = turns.slice(0, -maxRecent);
    const recentTurns = turns.slice(-maxRecent);

    // 2. Identify turn IDs that contain explicit instructions or unresolved tasks
    const criticalTurnIds = new Set<string>();
    for (const item of items) {
      if (item.turnId && (item.isExplicitInstruction || item.isUnresolvedTask || item.importance === 'CRITICAL')) {
        criticalTurnIds.add(item.turnId);
      }
    }

    // 3. From older turns, extract preserved critical turns and turns to be summarized
    const preservedOlderTurns: ConversationTurn[] = [];
    const turnsToSummarize: ConversationTurn[] = [];

    for (const turn of olderTurns) {
      if (criticalTurnIds.has(turn.id)) {
        preservedOlderTurns.push(turn);
      } else {
        // Ephemeral short chatter is discarded; others are summarized
        const wordCount = turn.content.trim().split(/\s+/).length;
        if (wordCount > 4) {
          turnsToSummarize.push(turn);
        }
      }
    }

    // 4. Generate deterministic summary of summarized turns
    let summaryTurn: ConversationTurn | undefined;
    if (turnsToSummarize.length > 0) {
      const topicsCovered = Array.from(new Set(
        turnsToSummarize.map(t => t.content.slice(0, 30).trim())
      )).slice(0, 3);

      const summaryContent = `[Tóm tắt ngữ cảnh trước (${turnsToSummarize.length} lượt trao đổi): ${topicsCovered.join('; ')}...]`;

      summaryTurn = {
        id: `turn_compact_${Date.now()}`,
        sender: 'system',
        content: summaryContent,
        timestamp: new Date().toISOString(),
        metadata: {
          isCompactedSummary: true,
          originalTurnsSummarized: turnsToSummarize.length,
        },
      };
    }

    // 5. Assemble final compacted list
    const finalTurns: ConversationTurn[] = [];
    if (summaryTurn) {
      finalTurns.push(summaryTurn);
    }
    finalTurns.push(...preservedOlderTurns);
    finalTurns.push(...recentTurns);

    const purgedTurnCount = originalTurnCount - (finalTurns.length - (summaryTurn ? 1 : 0));

    const compactionState: CompactionState = {
      compacted: true,
      originalTurnCount,
      compactedTurnCount: finalTurns.length,
      summary: summaryTurn?.content,
      timestamp: new Date().toISOString(),
    };

    return {
      compactedTurns: finalTurns,
      compactionState,
      purgedTurnCount,
    };
  }
}

export const globalContextCompactor = new ContextCompactor();
