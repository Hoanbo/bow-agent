// src/core/partnership/contextRelevanceEngine.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Section 9: Context Relevance Engine
// Retrieves memory and context based on genuine relevance vectors:
// - Semantic token overlap (honest lexical/keyword matching, no fake relevance scores)
// - Project & task relationships
// - Temporal relevance (recency decay)
// - Owner preference relevance
// - Prior failure / incident relevance
// - Security relevance
// - Decision & problem history
//
// Invariant: Prefer relevant context over maximum context volume.
// If relevance cannot be established honestly, mark the context as uncertain.

import {
  PersonalMemoryItem,
  KnowledgeGraphNode,
} from './partnershipTypes';
import { PersonalKnowledgeGraph } from './personalKnowledgeGraph';

export interface ContextQuery {
  objective: string;
  projectId?: string;
  taskId?: string;
  tags?: string[];
  includeUnresolvedProblems?: boolean;
  includePreferences?: boolean;
  includeDecisions?: boolean;
  limit?: number;
  minScoreThreshold?: number;
}

export interface ScoredMemoryItem {
  item: PersonalMemoryItem;
  relevanceScore: number; // 0.0 to 1.0 honest score
  matchReasons: string[];
  isUncertain: boolean;
}

export class ContextRelevanceEngine {
  private readonly defaultLimit: number;
  private readonly minScoreThreshold: number;

  constructor(options?: { defaultLimit?: number; minScoreThreshold?: number }) {
    this.defaultLimit = options?.defaultLimit ?? 10;
    this.minScoreThreshold = options?.minScoreThreshold ?? 0.15;
  }

  /**
   * Tokenize text into lower-case semantic tokens, stripping punctuation.
   */
  private tokenize(text: string): Set<string> {
    if (!text || typeof text !== 'string') return new Set();
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
    return new Set(tokens);
  }

  /**
   * Compute Jaccard / Overlap similarity between query tokens and target text/tags.
   */
  private computeTokenOverlap(queryTokens: Set<string>, contentTokens: Set<string>): number {
    if (queryTokens.size === 0 || contentTokens.size === 0) return 0;
    let intersection = 0;
    for (const q of queryTokens) {
      if (contentTokens.has(q)) {
        intersection++;
      }
    }
    // Honest overlap score: ratio of query tokens present in content
    return intersection / queryTokens.size;
  }

  /**
   * Filter and score personal memory items honestly.
   */
  public selectRelevantContext(
    query: ContextQuery,
    candidates: PersonalMemoryItem[]
  ): ScoredMemoryItem[] {
    const queryTokens = this.tokenize(query.objective);
    const limit = query.limit ?? this.defaultLimit;
    const threshold = query.minScoreThreshold ?? this.minScoreThreshold;

    const scored: ScoredMemoryItem[] = [];

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    for (const item of candidates) {
      // Ignore archived or superseded unless explicitly requested
      if (item.status === 'ARCHIVED' || item.status === 'SUPERSEDED') {
        continue;
      }

      let score = 0;
      const matchReasons: string[] = [];

      // 1. Semantic content & tag overlap
      const contentTokens = this.tokenize(item.content);
      for (const t of item.tags) {
        contentTokens.add(t.toLowerCase());
      }
      const overlap = this.computeTokenOverlap(queryTokens, contentTokens);
      if (overlap > 0) {
        score += overlap * 0.5; // up to 0.5 for full semantic match
        matchReasons.push(`Semantic token match (${(overlap * 100).toFixed(0)}%)`);
      }

      // 2. Project relationship
      if (query.projectId && item.metadata?.projectId === query.projectId) {
        score += 0.25;
        matchReasons.push(`Direct project match (${query.projectId})`);
      } else if (query.projectId && item.content.toLowerCase().includes(query.projectId.toLowerCase())) {
        score += 0.15;
        matchReasons.push(`Project mentioned in content (${query.projectId})`);
      }

      // 3. Task relationship
      if (query.taskId && item.metadata?.taskId === query.taskId) {
        score += 0.2;
        matchReasons.push(`Direct task match (${query.taskId})`);
      }

      // 4. Tags match
      if (query.tags && query.tags.length > 0) {
        const itemTagsLower = item.tags.map((t) => t.toLowerCase());
        const matchingTags = query.tags.filter((t) => itemTagsLower.includes(t.toLowerCase()));
        if (matchingTags.length > 0) {
          const tagScore = (matchingTags.length / query.tags.length) * 0.2;
          score += tagScore;
          matchReasons.push(`Tags match: ${matchingTags.join(', ')}`);
        }
      }

      // 5. Category-specific relevance
      if (query.includeUnresolvedProblems && item.category === 'PROBLEM') {
        score += 0.15;
        matchReasons.push('Problem history match');
      }
      if (query.includePreferences && item.category === 'PREFERENCE') {
        score += 0.15;
        matchReasons.push('Owner preference match');
      }
      if (query.includeDecisions && item.category === 'DECISION') {
        score += 0.15;
        matchReasons.push('Decision history match');
      }

      // 6. Temporal recency (decay over 30 days, bonus up to 0.1)
      const ageDays = Math.max(0, (now - item.updatedAt) / ONE_DAY_MS);
      if (ageDays < 30) {
        const recencyBonus = (1 - ageDays / 30) * 0.1;
        score += recencyBonus;
        if (recencyBonus > 0.05) {
          matchReasons.push('Recent activity bonus');
        }
      }

      // 7. Security / invariant relevance
      if (
        item.tags.includes('security') ||
        item.category === 'CONSTRAINT' ||
        item.content.toLowerCase().includes('security') ||
        item.content.toLowerCase().includes('invariant')
      ) {
        if (query.objective.toLowerCase().includes('security') || query.objective.toLowerCase().includes('invariant')) {
          score += 0.25;
          matchReasons.push('Security constraint relevance');
        }
      }

      // Normalize score to 0.0 - 1.0 range
      const normalizedScore = Math.min(1.0, Math.max(0.0, score));

      const isUncertain = normalizedScore < threshold || matchReasons.length === 0;

      if (normalizedScore >= threshold || isUncertain) {
        scored.push({
          item,
          relevanceScore: Number(normalizedScore.toFixed(4)),
          matchReasons,
          isUncertain,
        });
      }
    }

    // Sort by relevance score descending
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit output volume
    return scored.slice(0, limit);
  }

  /**
   * Retrieve relevant nodes from the PersonalKnowledgeGraph.
   */
  public selectFromKnowledgeGraph(
    query: ContextQuery,
    graph: PersonalKnowledgeGraph
  ): KnowledgeGraphNode[] {
    const results: KnowledgeGraphNode[] = [];
    const queryTokens = this.tokenize(query.objective);

    if (query.projectId) {
      const hierarchy = graph.getProjectHierarchy(query.projectId);
      if (hierarchy.project) results.push(hierarchy.project);
      results.push(...hierarchy.goals, ...hierarchy.decisions, ...hierarchy.problems, ...hierarchy.outcomes);
    }

    if (query.includeUnresolvedProblems) {
      const problems = graph.getUnresolvedProblems();
      for (const p of problems) {
        if (!results.some((r) => r.id === p.id)) {
          results.push(p);
        }
      }
    }

    // Match nodes by label / properties
    const allNodes = graph.getAllNodes();
    for (const node of allNodes) {
      if (results.some((r) => r.id === node.id)) continue;

      const nodeTokens = this.tokenize(`${node.label} ${JSON.stringify(node.properties)}`);
      const overlap = this.computeTokenOverlap(queryTokens, nodeTokens);
      if (overlap > 0.2) {
        results.push(node);
      }
    }

    return results.slice(0, query.limit ?? this.defaultLimit);
  }
}
