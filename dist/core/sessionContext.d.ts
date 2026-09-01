import type { SessionContext, ProductItemResult, PlanItemResult } from './types.js';
/**
 * Lấy ngữ cảnh phiên chat hiện tại (tự động xóa nếu đã hết hạn TTL)
 */
export declare function getSessionContext(): SessionContext;
/**
 * Cập nhật ngữ cảnh phiên chat
 */
export declare function updateSessionContext(partial: Partial<SessionContext>): SessionContext;
/**
 * Ghi nhận sản phẩm & gói plan vừa được thảo luận
 * FIX 3.1 & 3.5: Khi chuyển sang sản phẩm mới (Topic Switch),
 * BẮT BUỘC reset planContext = null và lastMentionedPlan = undefined
 */
export declare function rememberProductContext(product: ProductItemResult, plan?: PlanItemResult): void;
/**
 * V3.2: Ghi nhận nhóm sản phẩm vừa được gợi ý (Multi-Product Recommendation Group)
 */
export declare function rememberRecommendedCandidates(candidates: ProductItemResult[]): void;
/**
 * Reset planContext về null (dành cho topic switch hoặc explicit clear)
 */
export declare function resetPlanContext(): void;
/**
 * Ghi nhận đơn hàng vừa được thảo luận
 */
export declare function rememberOrderContext(order: any): void;
/**
 * Ghi nhận danh mục vừa được thảo luận
 */
export declare function rememberCategoryContext(category: {
    id: string;
    name: string;
    slug: string;
}): void;
/**
 * Ghi nhận hoặc xóa ngữ cảnh bị trì hoãn (Deferred Context)
 */
export declare function rememberDeferredContext(deferred: import('./types').DeferredContext): void;
export declare function clearDeferredContext(): void;
/**
 * Xóa sạch ngữ cảnh (khi làm mới cuộc trò chuyện)
 */
export declare function clearSessionContext(): void;
