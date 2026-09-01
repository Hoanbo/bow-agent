// src/services/agent/contracts/shopAdapter.ts
// BOW AGENT V3.3 — STEP 1: COMPOSITE SHOP ADAPTER CONTRACT
//
// Composes domain-specific providers into a unified Shop boundary that isolates
// the Shop implementation (shopofbow) from the Agent Core.
// ============================================================================
// HOST ADAPTER REGISTRY & DETERMINISTIC STANDALONE FALLBACK
// ============================================================================
export const fallbackShopAdapter = {
    catalog: {
        getAllProducts: async () => [],
        findProductsByKeyword: async () => [],
        findProductBySlug: async () => null,
        getCategories: async () => [],
        getPlanById: async () => null,
        getPlanPrice: async () => null,
    },
    orders: {
        getOrder: async () => null,
        getUserOrders: async () => [],
        getWarrantyStatus: async () => ({
            orderId: '',
            isEligible: false,
            reason: 'Order not found',
            status: 'not_found',
            ticketCount: 0,
        }),
    },
    wallet: {
        getBalance: async () => 0,
        getDepositInstructions: async () => ({
            bankId: 'MB', accountNo: '0966821315',
            accountName: 'Shop of BOW',
            transferSyntax: 'BOW NAP',
            qrUrl: 'https://img.vietqr.io/image/MB-0966821315-compact2.png',
            suggestedAmounts: [50000, 100000, 200000, 500000],
        }),
    },
    knowledge: {
        getFaqs: async () => [],
        getNegativePolicies: async () => [],
        findFaqBySimilarity: async () => null,
        matchNegativePolicy: async () => null,
    },
    analytics: {
        recordEvent: async () => { },
        getEvents: async () => [],
        getDemandSummary: async () => ({}),
    },
    actions: {
        canHandleAction: () => false,
        handleAction: async (action) => ({
            actionId: action?.id || '',
            type: action?.type || 'NAVIGATE_CHECKOUT',
            success: false,
            handledLocally: false,
        }),
    },
    storage: {
        getProducts: async () => [],
        getPlans: async () => [],
        getCategories: async () => [],
        getFaqs: async () => [],
        getNegativePolicies: async () => [],
        getAgentEvents: async () => [],
        recordAgentEvent: async () => { },
        insertAnalyticsEvents: async () => { },
        getOrderById: async () => null,
        getOrdersForUser: async () => [],
        getTicketsForUser: async () => [],
        searchPromptsLibrary: async () => [],
        getActiveCoupons: async () => [],
        getSupportChannels: async () => ({ hotline: '0966 821 315', brand: 'Shop of BOW' }),
    },
};
let activeShopAdapter = fallbackShopAdapter;
export function setActiveShopAdapter(adapter) {
    activeShopAdapter = adapter;
}
export function getActiveShopAdapter() {
    return activeShopAdapter;
}
