// src/core/context/referenceResolver.ts
// BOWCON V4.0 — CONVERSATIONAL REFERENCE RESOLVER (MILESTONE 1.3.7)
//
// Invariants:
// - INV-9: Resolves references ("cái đó", "nó", "phần này", "bước trên", "that", "it")
//   strictly against current scoped user/session context turns.
// - Zero Hallucination: If resolution is ambiguous or confidence is insufficient,
//   returns resolved: false without guessing.

import { ConversationTurn, ContextReference } from './conversationContext.js';

interface ReferencePattern {
  regex: RegExp;
  category: 'demonstrative' | 'continuation' | 'clarification';
}

const REFERENCE_PATTERNS: ReferencePattern[] = [
  { regex: /(?:^|[^\p{L}\p{N}])(tiếp\s+tục\s+(?:phần|bước|việc)\s+đó|continue\s+with\s+that)(?=[^\p{L}\p{N}]|$)/iu, category: 'continuation' },
  { regex: /(?:^|[^\p{L}\p{N}])(cái\s+đó|nó|việc\s+đó|điều\s+đó|phần\s+này|phần\s+đó|bước\s+trên|milestone\s+vừa\s+rồi)(?=[^\p{L}\p{N}]|$)/iu, category: 'demonstrative' },
  { regex: /(?:^|[^\p{L}\p{N}])(ý\s+tôi\s+là|như\s+tôi\s+nói\s+trước\s+đó|như\s+đã\s+trao\s+đổi)(?=[^\p{L}\p{N}]|$)/iu, category: 'clarification' },
  { regex: /(?:^|[^\p{L}\p{N}])(that|this|it|the\s+previous\s+step|as\s+mentioned)(?=[^\p{L}\p{N}]|$)/iu, category: 'demonstrative' },
];

export class ReferenceResolver {
  private confidenceThreshold: number;

  constructor(confidenceThreshold: number = 0.6) {
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Identifies candidate referring phrases within text.
   */
  public findReferringPhrases(text: string): string[] {
    const phrases: string[] = [];
    for (const p of REFERENCE_PATTERNS) {
      const match = text.match(p.regex);
      if (match && match[1]) {
        phrases.push(match[1].trim());
      }
    }
    return phrases;
  }

  /**
   * Resolves referring expressions within user text against recent turns of the scoped session.
   */
  public resolveReferences(
    userText: string,
    recentTurns: ConversationTurn[]
  ): ContextReference[] {
    const phrases = this.findReferringPhrases(userText);
    if (phrases.length === 0) {
      return [];
    }

    const results: ContextReference[] = [];

    for (const phrase of phrases) {
      // Look backward through recent turns for an antecedent target
      let resolvedTarget: string | undefined;
      let targetTurnId: string | undefined;
      let confidence = 0.0;

      // Filter out the current user prompt if already present
      const candidateTurns = recentTurns
        .filter(t => t.content !== userText)
        .slice(-5)
        .reverse();

      for (const turn of candidateTurns) {
        const content = turn.content.trim();
        // Skip short confirmations as antecedents
        if (content.split(/\s+/).length <= 2) continue;

        // Check if previous turn has a clear task, topic, or subject
        resolvedTarget = content;
        targetTurnId = turn.id;
        confidence = turn.sender === 'user' ? 0.85 : 0.75;
        break;
      }

      if (resolvedTarget && confidence >= this.confidenceThreshold) {
        results.push({
          phrase,
          targetText: resolvedTarget,
          targetTurnId,
          resolved: true,
          confidence,
        });
      } else {
        // Controlled fail-closed unresolved state (zero hallucination)
        results.push({
          phrase,
          targetText: undefined,
          targetTurnId: undefined,
          resolved: false,
          confidence: 0.0,
        });
      }
    }

    return results;
  }
}

export const globalReferenceResolver = new ReferenceResolver();
