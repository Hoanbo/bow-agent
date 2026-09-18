// src/contracts/shopAdapter.ts
// Composite boundary contract for Shop domain adapters
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
        hasSufficientBalance: async () => false,
    },
    knowledge: {
        getFaqs: async () => [],
        searchFaqs: async () => [],
        getNegativePolicies: async () => [],
    },
    analytics: {
        recordEvent: async () => { },
        getEvents: async () => [],
    },
    actions: {
        handleAction: async () => ({ actionId: 'fallback', type: 'COMMERCE_ACTION', success: false }),
        canHandleAction: () => false,
    },
    storage: {
        getProducts: async () => [],
        getPlans: async () => [],
        getCategories: async () => [],
        getOrderById: async () => null,
        getOrdersForUser: async () => [],
        getTicketsForUser: async () => [],
        getFaqs: async () => [],
        getNegativePolicies: async () => [],
        recordAgentEvent: async () => { },
        getAgentEvents: async () => [],
        insertAnalyticsEvents: async () => { },
    },
};
let activeShopAdapter = fallbackShopAdapter;
export function getActiveShopAdapter() {
    return activeShopAdapter;
}
export function setActiveShopAdapter(adapter) {
    activeShopAdapter = adapter;
}
