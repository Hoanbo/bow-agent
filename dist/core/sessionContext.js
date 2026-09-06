const CONTEXT_TTL_MS = 45 * 60 * 1000; // 45 phút
// Session-isolated context registry (NO single global mutable context)
const sessionContextRegistry = new Map();
function resolveContextKey(scope, userId) {
    if (typeof scope === 'object' && scope !== null) {
        const u = scope.userId && scope.userId.trim() ? scope.userId.trim() : 'anonymous';
        const s = (scope.sessionId || 'default_session').trim();
        return `${u}::${s}`;
    }
    if (typeof scope === 'string' && scope.trim()) {
        const s = scope.trim();
        if (userId && userId.trim()) {
            return `${userId.trim()}::${s}`;
        }
        // If no userId provided, check if there's an exact single session matching this sessionId
        const matches = Array.from(sessionContextRegistry.keys()).filter((k) => k.endsWith(`::${s}`));
        if (matches.length === 1) {
            return matches[0];
        }
        return `anonymous::${s}`;
    }
    return 'anonymous::default_session';
}
function createEmptySessionContext() {
    return {
        updatedAt: Date.now(),
        productSlug: undefined,
        planContext: null,
    };
}
/**
 * Lấy ngữ cảnh phiên chat (tự động xóa nếu đã hết hạn TTL)
 */
export function getSessionContext(scope, userId) {
    const key = resolveContextKey(scope, userId);
    let ctx = sessionContextRegistry.get(key);
    const now = Date.now();
    if (!ctx || now - ctx.updatedAt > CONTEXT_TTL_MS) {
        ctx = createEmptySessionContext();
        sessionContextRegistry.set(key, ctx);
    }
    return ctx;
}
/**
 * Cập nhật ngữ cảnh phiên chat
 */
export function updateSessionContext(partial, scope, userId) {
    const key = resolveContextKey(scope, userId);
    const current = getSessionContext(scope, userId);
    const now = Date.now();
    const updated = {
        ...current,
        ...partial,
        updatedAt: now,
    };
    // Đồng bộ productSlug khi có lastMentionedProduct
    if (partial.lastMentionedProduct && !partial.productSlug) {
        updated.productSlug = partial.lastMentionedProduct.slug;
    }
    // Đồng bộ planContext và lastMentionedPlan
    if (partial.lastMentionedPlan !== undefined && partial.planContext === undefined) {
        updated.planContext = partial.lastMentionedPlan || null;
    }
    else if (partial.planContext !== undefined && partial.lastMentionedPlan === undefined) {
        updated.lastMentionedPlan = partial.planContext || undefined;
    }
    sessionContextRegistry.set(key, updated);
    return updated;
}
/**
 * Ghi nhận sản phẩm & gói plan vừa được thảo luận
 * FIX 3.1 & 3.5: Khi chuyển sang sản phẩm mới (Topic Switch),
 * BẮT BUỘC reset planContext = null và lastMentionedPlan = undefined
 */
export function rememberProductContext(product, plan, scope, userId) {
    const current = getSessionContext(scope, userId);
    const previousProduct = current.lastMentionedProduct;
    const isNewProduct = !previousProduct ||
        previousProduct.id !== product.id ||
        (current.productSlug !== undefined && current.productSlug !== product.slug) ||
        previousProduct.slug !== product.slug;
    const isNotInCurrentGroup = current.lastRecommendedCandidates &&
        !current.lastRecommendedCandidates.some((c) => c.id === product.id);
    // Khi chuyển sang sản phẩm mới, không bao giờ kế thừa plan của sản phẩm trước
    const nextPlan = isNewProduct
        ? (plan || null)
        : (plan !== undefined ? plan : (current.planContext || null));
    updateSessionContext({
        lastMentionedProduct: product,
        productSlug: product.slug,
        lastMentionedPlan: nextPlan ? nextPlan : undefined,
        planContext: nextPlan,
        // Nếu chuyển sang một sản phẩm độc lập mới không thuộc nhóm đang đề xuất, xóa nhóm cũ
        lastRecommendedCandidates: isNotInCurrentGroup ? undefined : current.lastRecommendedCandidates,
    }, scope, userId);
}
/**
 * V3.2: Ghi nhận nhóm sản phẩm vừa được gợi ý (Multi-Product Recommendation Group)
 */
export function rememberRecommendedCandidates(candidates, scope, userId) {
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
        updateSessionContext({ lastRecommendedCandidates: undefined }, scope, userId);
        return;
    }
    // Deduplicate theo ID và giới hạn tối đa 6 candidates
    const seenIds = new Set();
    const validCandidates = [];
    for (const c of candidates) {
        if (c && c.id && c.name && !seenIds.has(c.id)) {
            seenIds.add(c.id);
            validCandidates.push(c);
            if (validCandidates.length >= 6)
                break;
        }
    }
    const current = getSessionContext(scope, userId);
    const nextProduct = validCandidates[0];
    const isNewProduct = !!nextProduct &&
        (!current.lastMentionedProduct ||
            current.lastMentionedProduct.id !== nextProduct.id ||
            current.productSlug !== nextProduct.slug);
    updateSessionContext({
        lastRecommendedCandidates: validCandidates.length > 0 ? validCandidates : undefined,
        // Đặt candidate đầu tiên làm lastMentionedProduct mặc định nếu chưa có
        lastMentionedProduct: nextProduct || current.lastMentionedProduct,
        productSlug: nextProduct?.slug || current.productSlug,
        lastMentionedPlan: isNewProduct ? undefined : current.lastMentionedPlan,
        planContext: isNewProduct ? null : (current.planContext || null),
    }, scope, userId);
}
/**
 * Reset planContext về null (dành cho topic switch hoặc explicit clear)
 */
export function resetPlanContext(scope, userId) {
    updateSessionContext({
        lastMentionedPlan: undefined,
        planContext: null,
    }, scope, userId);
}
/**
 * Ghi nhận đơn hàng vừa được thảo luận
 */
export function rememberOrderContext(order, scope, userId) {
    updateSessionContext({
        lastMentionedOrder: order,
    }, scope, userId);
}
/**
 * Ghi nhận danh mục vừa được thảo luận
 */
export function rememberCategoryContext(category, scope, userId) {
    updateSessionContext({
        lastMentionedCategory: category,
    }, scope, userId);
}
/**
 * Ghi nhận hoặc xóa ngữ cảnh bị trì hoãn (Deferred Context)
 */
export function rememberDeferredContext(deferred, scope, userId) {
    updateSessionContext({
        deferredContext: deferred,
    }, scope, userId);
}
export function clearDeferredContext(scope, userId) {
    updateSessionContext({
        deferredContext: undefined,
    }, scope, userId);
}
/**
 * Xóa sạch ngữ cảnh (khi làm mới cuộc trò chuyện)
 */
export function clearSessionContext(scope, userId) {
    const key = resolveContextKey(scope, userId);
    sessionContextRegistry.set(key, createEmptySessionContext());
}
