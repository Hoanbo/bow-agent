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
import type { AdminProvider } from './adminProvider.js';

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
  readonly admin?: AdminProvider;
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
  admin: {
    getSalesReport: async (timeframe = 'today') => {
      const now = new Date();
      return {
        timeframe,
        startDate: now.toISOString(),
        endDate: now.toISOString(),
        totalOrders: 24,
        completedOrders: 22,
        pendingOrders: 1,
        cancelledOrders: 1,
        totalRevenue: 2850000,
        totalProfit: 1425000,
        averageOrderValue: 118750,
        growthRatePercent: 14.5,
        warrantyIncidentRate: 0.02,
        topProducts: [
          { productId: 'canva-pro', name: 'Canva Pro vĩnh viễn / 1 năm', unitsSold: 12, revenue: 1440000, percentageOfTotal: 50.5 },
          { productId: 'youtube-premium', name: 'YouTube Premium 6 tháng', unitsSold: 6, revenue: 840000, percentageOfTotal: 29.5 },
          { productId: 'chatgpt-plus', name: 'ChatGPT Plus 1 tháng', unitsSold: 4, revenue: 570000, percentageOfTotal: 20.0 },
        ],
        notes: 'Doanh thu hôm nay tăng trưởng tốt nhờ chiến dịch Canva Pro. Tỷ lệ đơn lỗi bảo hành rất thấp (2%).',
      };
    },
    getInventoryHealth: async () => {
      return {
        totalSkus: 8,
        healthySkus: 6,
        lowStockSkus: 2,
        outOfStockSkus: 0,
        items: [
          { productId: 'canva-pro', productName: 'Canva Pro', availableSlots: 45, totalCapacity: 100, status: 'healthy', estimatedDaysRemaining: 15 },
          { productId: 'youtube-premium', productName: 'YouTube Premium', availableSlots: 18, totalCapacity: 50, status: 'healthy', estimatedDaysRemaining: 8 },
          { productId: 'netflix-premium', productName: 'Netflix Premium 4K', availableSlots: 3, totalCapacity: 20, status: 'low_stock', estimatedDaysRemaining: 2 },
          { productId: 'chatgpt-plus', productName: 'ChatGPT Plus', availableSlots: 4, totalCapacity: 15, status: 'low_stock', estimatedDaysRemaining: 2 },
          { productId: 'spotify-premium', productName: 'Spotify Premium', availableSlots: 32, totalCapacity: 60, status: 'healthy', estimatedDaysRemaining: 12 },
        ],
        urgentRestockRecommendations: [
          'Netflix Premium 4K chỉ còn 3 slot (dự kiến hết trong 48h tới)',
          'ChatGPT Plus chỉ còn 4 slot (nhu cầu đang cao)',
        ],
        timestamp: new Date().toISOString(),
      };
    },
    createVoucher: async (options) => {
      const discountDisplay = options.discountPercent ? `${options.discountPercent}%` : `${(options.discountAmount || 0).toLocaleString('vi-VN')}đ`;
      const code = (options.code || 'BOW_SPECIAL').toUpperCase();
      return {
        success: true,
        voucher: {
          code,
          discountDisplay,
          minOrderValue: options.minOrderValue || 0,
          expiresAt: options.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
          status: 'active',
        },
        message: `Đã tạo thành công voucher ${code} giảm ${discountDisplay} cho đơn từ ${(options.minOrderValue || 0).toLocaleString('vi-VN')}đ.`,
      };
    },
    inspectOrderDispute: async (identifier) => {
      return {
        orderId: identifier || 'BOW-ORD-9921',
        customerName: 'Nguyễn Văn An',
        customerPhone: '0912345678',
        productName: 'Netflix Premium 4K (1 Tháng)',
        orderTotal: 85000,
        purchaseDate: new Date(Date.now() - 2 * 86400000).toISOString(),
        warrantyStatus: 'valid',
        issueReported: 'Khách báo bị văng tài khoản, yêu cầu cấp lại mật khẩu hoặc đổi profile mới.',
        accountDetailsProvided: 'net_vip_04@bow.vn | profile 2',
        recommendedAction: 'Cấp lại mã PIN hoặc đổi slot profile 3 trong cùng gia đình Netflix.',
      };
    },
    getPendingFulfillmentQueue: async () => {
      return {
        totalPendingCount: 3,
        urgentCount: 1,
        orders: [
          {
            orderId: 'BOW-ORD-8812',
            customerName: 'Trần Minh Đức',
            customerPhone: '0987654321',
            productName: 'ChatGPT Plus 1 Tháng',
            planName: 'Gói 1 Tháng Riêng Tư',
            amountPaid: 450000,
            paidAt: new Date(Date.now() - 25 * 60000).toISOString(),
            waitingMinutes: 25,
            isUrgent: true,
            status: 'pending_procurement',
          },
          {
            orderId: 'BOW-ORD-8815',
            customerName: 'Lê Hoàng Yến',
            customerPhone: '0933112233',
            productName: 'Canva Pro Nâng Cấp',
            planName: 'Gói 1 Năm Giáo Viên',
            amountPaid: 180000,
            paidAt: new Date(Date.now() - 8 * 60000).toISOString(),
            waitingMinutes: 8,
            isUrgent: false,
            status: 'pending_procurement',
          },
          {
            orderId: 'BOW-ORD-8819',
            customerName: 'Phạm Quốc Bảo',
            customerPhone: '0909887766',
            productName: 'Netflix Premium 4K',
            planName: 'Slot 1 Tháng',
            amountPaid: 85000,
            paidAt: new Date(Date.now() - 3 * 60000).toISOString(),
            waitingMinutes: 3,
            isUrgent: false,
            status: 'pending_procurement',
          },
        ],
        timestamp: new Date().toISOString(),
      };
    },
    fulfillOrderHandover: async (options) => {
      const supplierCost = options.supplierCost || 320000;
      const amountPaid = 450000;
      const estimatedProfit = amountPaid - supplierCost;

      return {
        success: true,
        orderId: options.orderId,
        customerName: 'Trần Minh Đức',
        productName: 'ChatGPT Plus 1 Tháng',
        accountDetails: options.accountDetails,
        handedOverAt: new Date().toISOString(),
        estimatedProfit,
        message: `Đã bàn giao thành công đơn hàng #${options.orderId} cho khách hàng Trần Minh Đức. Lợi nhuận ước tính: ${estimatedProfit.toLocaleString('vi-VN')}đ.`,
      };
    },
    getProfitMarginReport: async (timeframe = 'today') => {
      return {
        timeframe,
        totalRevenue: 2850000,
        totalSupplierCost: 1650000,
        netProfit: 1200000,
        profitMarginPercent: 42.1,
        totalFulfilledOrders: 22,
        timestamp: new Date().toISOString(),
      };
    },
    getOrderLookup: async (orderId: string) => {
      const id = orderId || 'BOW-ORD-1234';
      return {
        orderId: id,
        customerName: 'Trần Minh Đức',
        customerEmail: 'duc.tran@gmail.com',
        productName: 'ChatGPT Plus 1 Tháng',
        planLabel: 'Gói 1 Tháng Riêng Tư',
        amount: 450000,
        status: 'paid',
        paymentStatus: 'paid',
        handoverStatus: 'pending_procurement',
        createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
        timeline: [
          { time: new Date(Date.now() - 30 * 60000).toISOString(), event: 'Khách hàng tạo đơn hàng' },
          { time: new Date(Date.now() - 25 * 60000).toISOString(), event: 'Thanh toán thành công qua SePay VietQR (450.000đ)' },
          { time: new Date(Date.now() - 24 * 60000).toISOString(), event: 'Đưa vào hàng đợi chờ Admin bàn giao tài khoản' },
        ],
        notes: 'Khách yêu cầu gửi qua email duc.tran@gmail.com',
      };
    },
    getDailySummary: async () => {
      return {
        date: new Date().toISOString().split('T')[0],
        pendingHandoverCount: 3,
        urgentOrdersCount: 1,
        unresolvedDisputesCount: 1,
        todayRevenue: 2850000,
        todayProfit: 1200000,
        activeVouchersCount: 4,
        summaryHighlights: [
          'Có 3 đơn chờ bàn giao (1 đơn cần xử lý gấp > 15p)',
          '1 khiếu nại văng tài khoản Netflix đơn #BOW-ORD-9921',
          'Doanh thu hôm nay đạt 2.850.000đ (Lợi nhuận ròng: 1.200.000đ)',
        ],
        recommendedFocus: 'Ưu tiên bàn giao đơn ChatGPT Plus #BOW-ORD-8812 và xử lý khiếu nại Netflix #BOW-ORD-9921.',
      };
    },
    getTaskPrioritization: async () => {
      return {
        generatedAt: new Date().toISOString(),
        summary: 'Có 3 việc cần ưu tiên xử lý trong ngày hôm nay theo thứ tự:',
        tasks: [
          {
            priority: 1,
            category: 'URGENT_HANDOVER',
            title: 'Bàn giao đơn gấp #BOW-ORD-8812',
            description: 'Khách Trần Minh Đức đã thanh toán 450k đang chờ 25 phút.',
            actionRequired: 'Nhập tài khoản ChatGPT Plus và bấm Bàn giao',
            targetId: 'BOW-ORD-8812',
          },
          {
            priority: 2,
            category: 'DISPUTE_REVIEW',
            title: 'Xử lý khiếu nại đơn #BOW-ORD-9921',
            description: 'Khách Nguyễn Văn An báo văng tài khoản Netflix Premium.',
            actionRequired: 'Cấp mã PIN mới hoặc đổi profile 3',
            targetId: 'BOW-ORD-9921',
          },
          {
            priority: 3,
            category: 'VOUCHER_EXPIRY',
            title: 'Kiểm tra voucher cuối tuần',
            description: 'Voucher BOWFLASH30 sẽ hết hạn trong 48h tới.',
            actionRequired: 'Xem xét gia hạn hoặc tạo mã mới cho khách',
          },
        ],
      };
    },
    getCustomerLookup: async (query: string) => {
      return {
        customerId: 'cust_minhduc_88',
        customerName: 'Trần Minh Đức',
        email: 'duc.tran@gmail.com',
        totalOrders: 4,
        totalSpent: 1350000,
        recentOrders: [
          { orderId: 'BOW-ORD-8812', productName: 'ChatGPT Plus 1 Tháng', amount: 450000, createdAt: new Date().toISOString(), status: 'paid' },
          { orderId: 'BOW-ORD-7210', productName: 'Canva Pro 1 Năm', amount: 250000, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), status: 'completed' },
          { orderId: 'BOW-ORD-6511', productName: 'YouTube Premium 1 Năm', amount: 450000, createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), status: 'completed' },
        ],
        disputeHistoryCount: 0,
        notes: 'Khách hàng thân thiết, thanh toán nhanh qua VietQR.',
      };
    },
    getActiveVouchers: async () => {
      return {
        totalActive: 3,
        vouchers: [
          { code: 'BOWFLASH20', discountDisplay: '20%', minOrderValue: 100000, expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(), status: 'active' },
          { code: 'BOWVIP30', discountDisplay: '30%', minOrderValue: 300000, expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(), status: 'active' },
          { code: 'CHAOBOW10K', discountDisplay: '10.000đ', minOrderValue: 50000, expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(), status: 'active' },
        ],
      };
    },
    dispatchShopEvent: async () => {},
  },
};




let activeShopAdapter: ShopAdapter = fallbackShopAdapter;

export function setActiveShopAdapter(adapter: ShopAdapter): void {
  activeShopAdapter = adapter;
}

export function getActiveShopAdapter(): ShopAdapter {
  return activeShopAdapter;
}
