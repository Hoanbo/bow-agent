import type { SessionContext, ProductItemResult, PlanItemResult } from './types.js';
import type { MemoryScope } from './memory.js';
/**
 * Lấy ngữ cảnh phiên chat (tự động xóa nếu đã hết hạn TTL)
 */
export declare function getSessionContext(scope?: MemoryScope | string, userId?: string): SessionContext;
/**
 * Cập nhật ngữ cảnh phiên chat
 */
export declare function updateSessionContext(partial: Partial<SessionContext>, scope?: MemoryScope | string, userId?: string): SessionContext;
/**
 * Ghi nhận sản phẩm & gói plan vừa được thảo luận
 * FIX 3.1 & 3.5: Khi chuyển sang sản phẩm mới (Topic Switch),
 * BẮT BUỘC reset planContext = null và lastMentionedPlan = undefined
 */
export declare function rememberProductContext(product: ProductItemResult, plan?: PlanItemResult, scope?: MemoryScope | string, userId?: string): void;
/**
 * V3.2: Ghi nhận nhóm sản phẩm vừa được gợi ý (Multi-Product Recommendation Group)
 */
export declare function rememberRecommendedCandidates(candidates: ProductItemResult[], scope?: MemoryScope | string, userId?: string): void;
/**
 * Reset planContext về null (dành cho topic switch hoặc explicit clear)
 */
export declare function resetPlanContext(scope?: MemoryScope | string, userId?: string): void;
/**
 * Ghi nhận đơn hàng vừa được thảo luận
 */
export declare function rememberOrderContext(order: any, scope?: MemoryScope | string, userId?: string): void;
/**
 * Ghi nhận danh mục vừa được thảo luận
 */
export declare function rememberCategoryContext(category: {
    id: string;
    name: string;
    slug: string;
}, scope?: MemoryScope | string, userId?: string): void;
/**
 * Ghi nhận hoặc xóa ngữ cảnh bị trì hoãn (Deferred Context)
 */
export declare function rememberDeferredContext(deferred: import('./types').DeferredContext, scope?: MemoryScope | string, userId?: string): void;
export declare function clearDeferredContext(scope?: MemoryScope | string, userId?: string): void;
/**
 * Xóa sạch ngữ cảnh (khi làm mới cuộc trò chuyện)
 */
export declare function clearSessionContext(scope?: MemoryScope | string, userId?: string): void;
