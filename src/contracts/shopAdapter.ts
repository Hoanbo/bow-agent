// src/services/agent/contracts/shopAdapter.ts
// BOW AGENT V3.3 — STEP 1: COMPOSITE SHOP ADAPTER CONTRACT
//
// Composes domain-specific providers into a unified Shop boundary that isolates
// the Shop implementation (shopofbow) from the Agent Core.

import type { CatalogProvider } from './catalogProvider.js';
import type { OrderProvider } from './orderProvider.js';
import type { WalletProvider } from './walletProvider.js';
import type { KnowledgeProvider } from './knowledgeProvider.js';
import type { AnalyticsProvider } from './analyticsProvider.js';
import type { ActionHandler } from './actionHandler.js';
import type { StorageAdapter } from './storageAdapter.js';

/**
 * ShopAdapter Interface
 * Represents the complete integration surface of Shop of BOW.
 * The Agent Core interacts exclusively through this composite boundary or its sub-providers,
 * completely unaware of Supabase, Vite, React, or browser window events.
 */
export interface ShopAdapter {
  readonly catalog: CatalogProvider;
  readonly orders: OrderProvider;
  readonly wallet: WalletProvider;
  readonly knowledge: KnowledgeProvider;
  readonly analytics: AnalyticsProvider;
  readonly actions: ActionHandler;
  readonly storage?: StorageAdapter;
}


// ============================================================================
// HOST ADAPTER REGISTRY & DETERMINISTIC STANDALONE FALLBACK
// ============================================================================

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
    recordEvent: async () => {},
    getEvents: async () => [],
    getDemandSummary: async () => ({
      
    }),
  },
  actions: {
    canHandleAction: () => false,
    handleAction: async (action: any) => ({
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
    recordAgentEvent: async () => {},
    insertAnalyticsEvents: async () => {},
    getOrderById: async () => null,
    getOrdersForUser: async () => [],
    getTicketsForUser: async () => [],
    searchPromptsLibrary: async () => [],
    getActiveCoupons: async () => [],
    getSupportChannels: async () => ({ hotline: '0966 821 315', brand: 'Shop of BOW' }),
  },
};

let activeShopAdapter: ShopAdapter = fallbackShopAdapter;

export function setActiveShopAdapter(adapter: ShopAdapter): void {
  activeShopAdapter = adapter;
}

export function getActiveShopAdapter(): ShopAdapter {
  return activeShopAdapter;
}
