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
export declare class KnowledgeBase {
    searchFaq(query: string, options?: SearchKnowledgeOptions): Promise<FaqMatchResult[]>;
    getNegativePolicies(): Promise<NegativePolicyItem[]>;
}
export declare const knowledgeBase: KnowledgeBase;
