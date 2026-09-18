import type { CategoryInfo, CategoryResolution } from './types.js';
export interface CategoryLookupProvider {
    getCategories(): Promise<CategoryInfo[]>;
}
export type { CategoryInfo, CategoryResolution };
/**
 * Lấy danh sách danh mục từ Database
 */
export declare function getAllCategories(catalogProvider?: CategoryLookupProvider): Promise<CategoryInfo[]>;
/**
 * Phân giải intent Category từ câu hỏi của người dùng
 */
export declare function resolveCategoryQuery(rawQuery: string): Promise<CategoryResolution>;
