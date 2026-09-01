// src/knowledge/knowledgeBase.ts
// BOW AGENT V3.3 — FAQ RAG & VECTOR SEARCH

import { getActiveShopAdapter } from '../contracts/shopAdapter.js';
import type { FaqItem, NegativePolicyItem } from '../contracts/knowledgeProvider.js';

export interface SearchKnowledgeOptions {
  limit?: number;
  category?: string;
  threshold?: number;
}

export interface FaqMatchResult {
  faq: FaqItem;
  score: number;
}

/**
 * Clean text for simple vector / keyword cosine similarity calculation
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

export class KnowledgeBase {
  public async searchFaq(query: string, options: SearchKnowledgeOptions = {}): Promise<FaqMatchResult[]> {
    const adapter = getActiveShopAdapter();
    const faqs = await adapter.knowledge.getFaqs();
    const queryTokens = tokenize(query);

    const matches: FaqMatchResult[] = [];

    for (const faq of faqs) {
      if (options.category && faq.category !== options.category) {
        continue;
      }
      const faqTokens = tokenize(`${faq.question} ${faq.answer}`);
      const score = calculateJaccardSimilarity(queryTokens, faqTokens);
      if (score >= (options.threshold || 0.1)) {
        matches.push({ faq, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, options.limit || 5);
  }

  public async getNegativePolicies(): Promise<NegativePolicyItem[]> {
    const adapter = getActiveShopAdapter();
    return adapter.knowledge.getNegativePolicies();
  }
}

export const knowledgeBase = new KnowledgeBase();
