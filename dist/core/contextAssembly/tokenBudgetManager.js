// src/core/contextAssembly/tokenBudgetManager.ts
// BOWCON V4.0 — MS-1.4.03: TOKEN BUDGET MANAGER & ESTIMATION
//
// Invariants:
// HARD_CEILING <= 8192 TOKENS
// DETERMINISTIC_ESTIMATION == Math.ceil(chars / 4)
// TIER_1_ALONE_BREACH -> ContextBudgetExceededError
// NEVER_SILENTLY_RAISE_BUDGET == TRUE
import { HARD_MAX_PROMPT_TOKENS, DEFAULT_MAX_PROMPT_TOKENS, DEFAULT_MAX_COMPLETION_TOKENS, ContextTier, ContextBudgetExceededError, ContextValidationError, } from './contextTypes.js';
export class TokenBudgetManager {
    maxPromptTokens;
    maxCompletionTokens;
    reservedCompletionTokens;
    constructor(options) {
        const promptLimit = options?.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS;
        if (promptLimit > HARD_MAX_PROMPT_TOKENS) {
            throw new ContextBudgetExceededError(promptLimit, HARD_MAX_PROMPT_TOKENS, `Requested maxPromptTokens (${promptLimit}) cannot exceed hard maximum of ${HARD_MAX_PROMPT_TOKENS}`);
        }
        if (promptLimit <= 0) {
            throw new ContextValidationError('maxPromptTokens must be positive');
        }
        this.maxPromptTokens = promptLimit;
        this.maxCompletionTokens = options?.maxCompletionTokens ?? DEFAULT_MAX_COMPLETION_TOKENS;
        this.reservedCompletionTokens = options?.reservedCompletionTokens ?? 256;
    }
    getBudget() {
        return {
            maxPromptTokens: this.maxPromptTokens,
            maxCompletionTokens: this.maxCompletionTokens,
            reservedCompletionTokens: this.reservedCompletionTokens,
        };
    }
    /**
     * Deterministic token estimation approximation.
     * Standard 4 characters per token heuristic accounting for UTF-8 bytes.
     */
    estimateTokens(content) {
        if (!content || typeof content !== 'string')
            return 0;
        // Account for multibyte characters by using buffer byte length
        const byteLen = Buffer.byteLength(content, 'utf8');
        const charLen = content.length;
        // Effective length balances ASCII and CJK/multibyte density
        const effectiveLength = Math.max(charLen, Math.ceil(byteLen / 2));
        return Math.max(1, Math.ceil(effectiveLength / 4));
    }
    /**
     * Estimates aggregate token count across a collection of fragments.
     */
    estimateFragmentsTotalTokens(fragments) {
        return fragments.reduce((acc, f) => acc + f.tokenEstimate, 0);
    }
    /**
     * Validates whether Tier 1 (critical safety and task identity) fits within budget.
     * If Tier 1 alone breaches the budget, assembly cannot succeed safely and must fail closed.
     */
    validateTier1Budget(fragments) {
        const tier1Tokens = fragments
            .filter((f) => f.tier === ContextTier.TIER_1_CRITICAL)
            .reduce((acc, f) => acc + f.tokenEstimate, 0);
        if (tier1Tokens > this.maxPromptTokens) {
            throw new ContextBudgetExceededError(this.maxPromptTokens, tier1Tokens, { reason: 'Tier 1 Critical safety and task metadata exceeds total prompt budget' });
        }
    }
    /**
     * Checks if total estimated tokens exceed the max prompt tokens.
     */
    exceedsBudget(fragments) {
        const total = this.estimateFragmentsTotalTokens(fragments);
        return total > this.maxPromptTokens;
    }
}
