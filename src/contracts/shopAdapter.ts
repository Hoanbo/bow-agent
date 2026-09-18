// src/contracts/shopAdapter.ts
// Composite boundary contract for Shop domain adapters

import type { CatalogProvider } from './catalogProvider.js';
import type { OrderProvider } from './orderProvider.js';
import type { WalletProvider } from './walletProvider.js';
import type { AdminProvider } from './adminProvider.js';
import type { KnowledgeProvider } from './knowledgeProvider.js';
import type { AnalyticsProvider } from './analyticsProvider.js';
import type { ActionHandler } from './actionHandler.js';
import type { StorageAdapter } from './storageAdapter.js';

export interface ShopAdapter {
  readonly catalog: CatalogProvider;
  readonly orders: OrderProvider;
  readonly wallet: WalletProvider;
  readonly knowledge: KnowledgeProvider;
  readonly analytics: AnalyticsProvider;
  readonly actions: ActionHandler;
  readonly storage?: StorageAdapter;
  readonly admin?: AdminProvider;
}

export const fallbackShopAdapter: ShopAdapter = {
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
  } as any,
  analytics: {
    recordEvent: async () => {},
    getEvents: async () => [],
  } as any,
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
    recordAgentEvent: async () => {},
    getAgentEvents: async () => [],
    insertAnalyticsEvents: async () => {},
  } as any,
};

let activeShopAdapter: ShopAdapter = fallbackShopAdapter;

export function getActiveShopAdapter(): ShopAdapter {
  return activeShopAdapter;
}

export function setActiveShopAdapter(adapter: ShopAdapter): void {
  activeShopAdapter = adapter;
}
