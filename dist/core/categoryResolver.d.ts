import type { CatalogProvider } from '../contracts/index.js';
import type { CategoryInfo, CategoryResolution } from './types.js';
export type { CategoryInfo, CategoryResolution };
/**
 * Lấy danh sách danh mục từ Database
 */
export declare function getAllCategories(catalogProvider?: CatalogProvider): Promise<CategoryInfo[]>;
/**
 * Phân giải intent Category từ câu hỏi của người dùng
 */
export declare function resolveCategoryQuery(rawQuery: string): Promise<CategoryResolution>;
