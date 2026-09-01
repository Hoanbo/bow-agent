import { type ProductItemResult } from './tools.js';
export interface ProductResolutionResult {
    matched: boolean;
    confidence: number;
    matchType: 'exact_name' | 'exact_alias' | 'exact_slug' | 'prefix' | 'token_match' | 'fuzzy' | 'semantic' | 'category' | 'none';
    candidate?: ProductItemResult;
    candidates: ProductItemResult[];
    isAmbiguous: boolean;
    ambiguityMessage?: string;
    semanticCandidates?: ProductItemResult[];
    semanticMatchQuery?: string;
    extractedParams: {
        durationFilter?: string;
        isCheapestQuery?: boolean;
        isBestSellerQuery?: boolean;
        isMostExpensiveQuery?: boolean;
        isOtherPlanQuery?: boolean;
        isBuyNowQuery?: boolean;
        categoryFilter?: string;
    };
}
/**
 * Chuẩn hóa chuỗi tìm kiếm (xóa dấu câu, lowercase, trim)
 */
export declare function normalizeString(str: string): string;
/**
 * Làm sạch câu hỏi loại bỏ stop-words tiếng Việt
 * Giữ lại: tên sản phẩm thực sự, keyword ngắn có nghĩa
 */
export declare function cleanQueryTokens(rawText: string): string;
/**
 * DYNAMIC PRODUCT RESOLVER V2.2
 * Pipeline: Exact → Alias → Slug → Prefix → Token → Fuzzy → Semantic Demand
 */
export declare function resolveProductQuery(rawQuery: string): Promise<ProductResolutionResult>;
