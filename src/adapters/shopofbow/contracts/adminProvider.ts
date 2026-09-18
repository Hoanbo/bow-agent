// src/contracts/adminProvider.ts
// BOW AGENT V3.4 — EXECUTIVE ADMIN & BUSINESS INTELLIGENCE CONTRACT
//
// Abstracts shop business analytics, revenue reports, inventory health,
// and realtime shop event dispatching for the Owner / Robot Persona.

export type SalesTimeframe = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'all_time';

export interface TopProductMetric {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface SalesReportResult {
  timeframe: SalesTimeframe;
  startDate: string;
  endDate: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  growthRatePercent?: number;
  topProducts: TopProductMetric[];
  warrantyIncidentRate: number; // e.g. 0.02 = 2%
  notes?: string;
}

export interface InventoryItemHealth {
  productId: string;
  productName: string;
  availableSlots: number;
  totalCapacity: number;
  status: 'healthy' | 'low_stock' | 'out_of_stock';
  estimatedDaysRemaining: number;
}

export interface InventoryHealthResult {
  totalSkus: number;
  healthySkus: number;
  lowStockSkus: number;
  outOfStockSkus: number;
  items: InventoryItemHealth[];
  urgentRestockRecommendations: string[];
  timestamp: string;
}

export type ShopEventType = 'order.paid' | 'wallet.deposit' | 'stock.low' | 'ticket.urgent' | 'system.alert';

export interface ShopEventPayload {
  eventId: string;
  type: ShopEventType;
  title: string;
  description: string;
  amount?: number;
  customerName?: string;
  productName?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CreateVoucherOptions {
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  expiresAt?: string;
  description?: string;
}

export interface VoucherResult {
  success: boolean;
  voucher: {
    code: string;
    discountDisplay: string;
    minOrderValue: number;
    expiresAt: string;
    status: 'active' | 'inactive';
  };
  message: string;
}

export interface OrderDisputeResult {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  orderTotal: number;
  purchaseDate: string;
  warrantyStatus: 'valid' | 'expired' | 'under_review';
  issueReported?: string;
  accountDetailsProvided?: string;
  recommendedAction: string;
}

export interface PendingFulfillmentOrder {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  planName?: string;
  amountPaid: number;
  paidAt: string;
  waitingMinutes: number;
  isUrgent: boolean; // > 15 minutes
  status: 'pending_procurement';
}

export interface PendingFulfillmentResult {
  totalPendingCount: number;
  urgentCount: number;
  orders: PendingFulfillmentOrder[];
  timestamp: string;
}

export interface FulfillHandoverOptions {
  orderId: string;
  accountDetails: string;
  supplierCost?: number;
  notes?: string;
}

export interface FulfillHandoverResult {
  success: boolean;
  orderId: string;
  customerName: string;
  productName: string;
  accountDetails: string;
  handedOverAt: string;
  estimatedProfit?: number;
  message: string;
}

export interface ProfitMarginReportResult {
  timeframe: string;
  totalRevenue: number;
  totalSupplierCost: number;
  netProfit: number;
  profitMarginPercent: number;
  totalFulfilledOrders: number;
  timestamp: string;
}

export interface AdminOrderLookupResult {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  productName: string;
  planLabel?: string;
  amount: number;
  status: 'paid' | 'pending' | 'completed' | 'cancelled' | 'refunded' | string;
  paymentStatus: 'paid' | 'pending' | 'failed' | string;
  handoverStatus: 'delivered' | 'pending_procurement' | 'failed' | string;
  createdAt: string;
  accountDetails?: string;
  notes?: string;
  timeline: Array<{ time: string; event: string }>;
}

export interface AdminDailySummaryResult {
  date: string;
  pendingHandoverCount: number;
  urgentOrdersCount: number;
  unresolvedDisputesCount: number;
  todayRevenue: number;
  todayProfit: number;
  activeVouchersCount: number;
  summaryHighlights: string[];
  recommendedFocus: string;
}

export interface AdminTaskPriorityItem {
  priority: number;
  category: 'URGENT_HANDOVER' | 'DISPUTE_REVIEW' | 'VOUCHER_EXPIRY' | 'SUPPLIER_FOLLOWUP' | 'GENERAL';
  title: string;
  description: string;
  actionRequired: string;
  targetId?: string;
}

export interface AdminTaskPrioritizationResult {
  tasks: AdminTaskPriorityItem[];
  generatedAt: string;
  summary: string;
}

export interface AdminCustomerLookupResult {
  customerId: string;
  customerName: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  recentOrders: Array<{ orderId: string; productName: string; amount: number; createdAt: string; status: string }>;
  disputeHistoryCount: number;
  notes?: string;
}

export interface VoucherListResult {
  vouchers: Array<{
    code: string;
    discountDisplay: string;
    minOrderValue: number;
    expiresAt: string;
    status: 'active' | 'inactive';
  }>;
  totalActive: number;
}

export interface AdminProvider {
  /**
   * Fetch comprehensive sales, revenue, and order metrics for a given timeframe
   */
  getSalesReport(timeframe?: SalesTimeframe): Promise<SalesReportResult>;

  /**
   * Fetch real-time stock levels, remaining slots, and restock alerts (if any)
   */
  getInventoryHealth(): Promise<InventoryHealthResult>;

  /**
   * Fetch pending on-demand fulfillment queue (orders paid by customers awaiting procurement & handover)
   */
  getPendingFulfillmentQueue?(): Promise<PendingFulfillmentResult>;

  /**
   * Hand over acquired account/key to customer for a pending order
   */
  fulfillOrderHandover?(options: FulfillHandoverOptions): Promise<FulfillHandoverResult>;

  /**
   * Fetch Net Profit report (Revenue minus Supplier Procurement Cost)
   */
  getProfitMarginReport?(timeframe?: SalesTimeframe): Promise<ProfitMarginReportResult>;

  /**
   * Create a new shop promotional voucher
   */
  createVoucher?(options: CreateVoucherOptions): Promise<VoucherResult>;

  /**
   * Inspect and resolve an order dispute or warranty issue
   */
  inspectOrderDispute?(identifier: string): Promise<OrderDisputeResult>;

  /**
   * Lookup complete details and timeline for a specific order
   */
  getOrderLookup?(orderId: string): Promise<AdminOrderLookupResult | null>;

  /**
   * Generate daily operational summary for the Shop Admin
   */
  getDailySummary?(): Promise<AdminDailySummaryResult>;

  /**
   * Generate prioritized actionable tasks list for the day
   */
  getTaskPrioritization?(): Promise<AdminTaskPrioritizationResult>;

  /**
   * Lookup customer purchase history safely (no credentials)
   */
  getCustomerLookup?(query: string): Promise<AdminCustomerLookupResult | null>;

  /**
   * List active promotional vouchers
   */
  getActiveVouchers?(): Promise<VoucherListResult>;

  /**
   * Dispatch a business event into the agent internal event mesh
   */
  dispatchShopEvent?(event: ShopEventPayload): Promise<void>;
}


