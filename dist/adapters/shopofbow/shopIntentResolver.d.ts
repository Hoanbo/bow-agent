import type { PlanItemResult, DeferredContext } from '../../core/types.js';
/**
 * Domain-specific duration extractor including token package sizes
 */
export declare function extractShopDuration(text: string): string | undefined;
/**
 * Matches retail plans by duration and aliases (YouTube, Canva, Netflix, etc.)
 */
export declare function matchPlanByDuration(plans: PlanItemResult[], durationOrText: string, fullQuery?: string): PlanItemResult | undefined;
/**
 * Extracts deferred retail buy context from user queries
 */
export declare function extractDeferredBuyContext(text: string): DeferredContext;
