import type { ProductItemResult, CategoryInfo } from './types.js';
/**
 * Format thông tin chi tiết sản phẩm và các plan
 */
export declare function formatSingleProductResponse(product: ProductItemResult, selectedPlan?: any): string;
/**
 * Format Catalog Overview
 */
export declare function formatCatalogOverviewResponse(products: ProductItemResult[], categories: CategoryInfo[]): {
    content: string;
    suggestions: string[];
};
/**
 * Format Category Detail
 */
export declare function formatCategoryDetailResponse(category: CategoryInfo, products: ProductItemResult[]): {
    content: string;
    suggestions: string[];
};
/**
 * Format Compact Orders Response
 */
export declare function formatCompactOrdersResponse(rawOrders: any[], queryText: string): {
    content: string;
    suggestions: string[];
    topOrder?: any;
};
