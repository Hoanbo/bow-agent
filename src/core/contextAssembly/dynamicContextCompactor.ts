// src/core/contextAssembly/dynamicContextCompactor.ts
// BOWCON V4.0 — MS-1.4.03: DETERMINISTIC DYNAMIC CONTEXT COMPACTION
//
// Invariants:
// ZERO_LLM_INVOCATION == TRUE
// STRICTLY_DETERMINISTIC_PRUNING == TRUE
// TIER_1_IMMUTABLE_PRESERVATION == TRUE
// STAGED_COMPACTION_SEQUENCE == Tier 4 -> Tier 3 -> Tier 2 -> (Tier 1 check)
// BUDGET_EXCEEDED_IF_TIER_1_OVER_LIMIT == TRUE

import {
  ContextTier,
  type ContextFragment,
  type ContextCompactionMetrics,
  ContextBudgetExceededError,
} from './contextTypes.js';
import { TokenBudgetManager } from './tokenBudgetManager.js';

export interface DynamicCompactionResult {
  readonly compactedFragments: readonly ContextFragment[];
  readonly metrics: ContextCompactionMetrics;
}

export class DynamicContextCompactor {
  private readonly budgetManager: TokenBudgetManager;

  constructor(budgetManager: TokenBudgetManager) {
    this.budgetManager = budgetManager;
  }

  /**
   * Evaluates if compaction is needed and performs deterministic multi-stage pruning.
   */
  public compact(
    fragments: readonly ContextFragment[],
    onStageChange?: (stage: string) => void
  ): DynamicCompactionResult {
    const budget = this.budgetManager.getBudget();
    const originalTokens = this.budgetManager.estimateFragmentsTotalTokens(fragments);

    // If already within budget, return fragments intact without modifications
    if (originalTokens <= budget.maxPromptTokens) {
      return {
        compactedFragments: Object.freeze([...fragments]),
        metrics: {
          compactionApplied: false,
          originalTokenEstimate: originalTokens,
          finalTokenEstimate: originalTokens,
          tokensSaved: 0,
          droppedFragmentCount: 0,
          compactedFragmentCount: 0,
          truncatedFragmentCount: 0,
          compactedTiers: Object.freeze([]),
        },
      };
    }

    // Step 0: Ensure Tier 1 Critical fragments alone do not exceed budget
    this.budgetManager.validateTier1Budget(fragments);

    let currentFragments = [...fragments];
    let droppedCount = 0;
    let compactedCount = 0;
    let truncatedCount = 0;
    const affectedTiers = new Set<ContextTier>();

    // ------------------------------------------------------------------------
    // STAGE 1: Purge Tier 4 (Low Priority: Ephemeral turns, verbose schemas)
    // ------------------------------------------------------------------------
    if (this.budgetManager.estimateFragmentsTotalTokens(currentFragments) > budget.maxPromptTokens) {
      onStageChange?.('STAGE_1_PURGE_TIER_4');
      const tier4Fragments = currentFragments.filter((f) => f.tier === ContextTier.TIER_4_LOW);
      if (tier4Fragments.length > 0) {
        affectedTiers.add(ContextTier.TIER_4_LOW);
        droppedCount += tier4Fragments.length;
        currentFragments = currentFragments.filter((f) => f.tier !== ContextTier.TIER_4_LOW);
      }
    }

    // ------------------------------------------------------------------------
    // STAGE 2: Compact Tier 3 (Medium Priority: Older turns & Completed steps)
    // ------------------------------------------------------------------------
    if (this.budgetManager.estimateFragmentsTotalTokens(currentFragments) > budget.maxPromptTokens) {
      onStageChange?.('STAGE_2_COMPACT_TIER_3');
      const compactedTier3: ContextFragment[] = [];
      for (const frag of currentFragments) {
        if (frag.tier === ContextTier.TIER_3_MEDIUM) {
          affectedTiers.add(ContextTier.TIER_3_MEDIUM);
          if (frag.canDrop && frag.priority < 55) {
            // Drop lowest-priority Tier 3 fragments first
            droppedCount++;
          } else {
            // Condense content deterministically
            const condensed = this.condenseTier3Content(frag.content);
            const newTokenEstimate = this.budgetManager.estimateTokens(condensed);
            compactedCount++;
            compactedTier3.push(
              Object.freeze({
                ...frag,
                content: condensed,
                tokenEstimate: newTokenEstimate,
              })
            );
          }
        } else {
          compactedTier3.push(frag);
        }
      }
      currentFragments = compactedTier3;
    }

    // ------------------------------------------------------------------------
    // STAGE 3: Truncate Tier 2 (High Priority: Parameter JSON & Notes)
    // ------------------------------------------------------------------------
    if (this.budgetManager.estimateFragmentsTotalTokens(currentFragments) > budget.maxPromptTokens) {
      onStageChange?.('STAGE_3_TRUNCATE_TIER_2');
      const truncatedTier2: ContextFragment[] = [];
      for (const frag of currentFragments) {
        if (frag.tier === ContextTier.TIER_2_HIGH && frag.canTruncate) {
          affectedTiers.add(ContextTier.TIER_2_HIGH);
          const truncated = this.truncateTier2Content(frag.content, 200);
          if (truncated.length < frag.content.length) {
            truncatedCount++;
            const newTokenEstimate = this.budgetManager.estimateTokens(truncated);
            truncatedTier2.push(
              Object.freeze({
                ...frag,
                content: truncated,
                tokenEstimate: newTokenEstimate,
              })
            );
          } else {
            truncatedTier2.push(frag);
          }
        } else {
          truncatedTier2.push(frag);
        }
      }
      currentFragments = truncatedTier2;
    }

    // ------------------------------------------------------------------------
    // STAGE 4: Final Validation Gate
    // ------------------------------------------------------------------------
    const finalTokens = this.budgetManager.estimateFragmentsTotalTokens(currentFragments);
    if (finalTokens > budget.maxPromptTokens) {
      // If even after compacting Tier 4, Tier 3, and Tier 2, the context still exceeds budget:
      // Check if dropping remaining Tier 3 completely brings it within bounds
      const withoutTier3 = currentFragments.filter((f) => f.tier !== ContextTier.TIER_3_MEDIUM);
      const remainingTokensWithoutTier3 = this.budgetManager.estimateFragmentsTotalTokens(withoutTier3);
      if (remainingTokensWithoutTier3 <= budget.maxPromptTokens) {
        droppedCount += currentFragments.length - withoutTier3.length;
        currentFragments = withoutTier3;
      } else {
        // Fail closed: Tier 1 + remaining critical Tier 2 exceed the budget
        throw new ContextBudgetExceededError(
          budget.maxPromptTokens,
          finalTokens,
          {
            originalTokens,
            finalTokens,
            droppedCount,
            compactedCount,
            truncatedCount,
          }
        );
      }
    }

    const resolvedFinalTokens = this.budgetManager.estimateFragmentsTotalTokens(currentFragments);
    const tokensSaved = Math.max(0, originalTokens - resolvedFinalTokens);

    return {
      compactedFragments: Object.freeze(currentFragments),
      metrics: {
        compactionApplied: true,
        originalTokenEstimate: originalTokens,
        finalTokenEstimate: resolvedFinalTokens,
        tokensSaved,
        droppedFragmentCount: droppedCount,
        compactedFragmentCount: compactedCount,
        truncatedFragmentCount: truncatedCount,
        compactedTiers: Object.freeze(Array.from(affectedTiers).sort()),
      },
    };
  }

  /**
   * Deterministically condenses Tier 3 textual content.
   */
  private condenseTier3Content(content: string): string {
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length <= 2) {
      return content.slice(0, 160);
    }
    // Retain first line and last line, condense intermediate lines
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];
    const intermediateCount = lines.length - 2;
    return `${firstLine}\n[... ${intermediateCount} intermediate turn(s) omitted ...]\n${lastLine}`;
  }

  /**
   * Truncates Tier 2 content deterministically without destroying action labels.
   */
  private truncateTier2Content(content: string, maxChars: number): string {
    if (content.length <= maxChars) {
      return content;
    }
    return `${content.slice(0, maxChars)}... [TRUNCATED]`;
  }
}
