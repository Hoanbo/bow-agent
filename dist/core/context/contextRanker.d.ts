import { ContextItem } from './conversationContext.js';
export interface RankingOptions {
    activeTopic?: string;
    maxItems?: number;
}
export declare class ContextRanker {
    /**
     * Computes a deterministic composite relevance score for a context item.
     */
    scoreItem(item: ContextItem, activeTopic?: string, indexFromEnd?: number): number;
    /**
     * Ranks candidate context items and returns the top items sorted by score descending.
     */
    rankItems(items: ContextItem[], options?: RankingOptions): ContextItem[];
}
export declare const globalContextRanker: ContextRanker;
