// src/tools/shopTools.ts
// BOW AGENT V3.3 — E-COMMERCE & SHOP OF BOW AGENT PLUGINS

import { toolRegistry } from './registry.js';
import {
  searchProducts,
  getMyOrders,
  getMyWalletBalance,
  checkWarrantyPolicy,
  getActiveCoupons,
  getFaqsAndGuides,
  getSupportChannels,
} from '../core/tools.js';
import { getActiveShopAdapter } from '../contracts/shopAdapter.js';

// 1. Search Products Tool
toolRegistry.register({
  name: 'search_products',
  description: 'Tìm kiếm sản phẩm trong danh mục Shop of BOW theo từ khóa hoặc danh mục.',
  parameters: {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: 'Từ khóa tìm kiếm sản phẩm' },
      categoryId: { type: 'string', description: 'ID danh mục sản phẩm (tùy chọn)' },
      limit: { type: 'number', description: 'Số lượng kết quả tối đa' },
    },
  },
  execute: async (args) => {
    return await searchProducts(args);
  },
});

// 2. Get My Orders Tool
toolRegistry.register({
  name: 'get_my_orders',
  description: 'Tra cứu danh sách đơn hàng của người dùng đã đăng nhập.',
  parameters: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Số lượng đơn hàng tối đa' },
      status: { type: 'string', description: 'Trạng thái đơn hàng cần lọc' },
    },
  },
  execute: async (args, context) => {
    return await getMyOrders(args, context);
  },
});

// 3. Get Wallet Balance Tool
toolRegistry.register({
  name: 'get_my_wallet_balance',
  description: 'Tra cứu số dư ví Shop of BOW của người dùng.',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (_args, context) => {
    return await getMyWalletBalance(context);
  },
});

// 4. Get Deposit Instructions Tool
toolRegistry.register({
  name: 'get_deposit_instructions',
  description: 'Lấy thông tin tài khoản ngân hàng và mã QR chuyển khoản VietQR nạp ví tự động.',
  parameters: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Số tiền muốn nạp (VND)' },
    },
  },
  execute: async (args) => {
    const adapter = getActiveShopAdapter();
    const instructions = await adapter.wallet.getDepositInstructions(args?.amount);
    return { success: true, data: instructions };
  },
});

// 5. Check Warranty Policy Tool
toolRegistry.register({
  name: 'check_warranty_policy',
  description: 'Tra cứu chính sách bảo hành, hoàn tiền hoặc đổi trả.',
  parameters: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'Mã đơn hàng cần kiểm tra bảo hành' },
      productName: { type: 'string', description: 'Tên sản phẩm cần kiểm tra bảo hành' },
    },
  },
  execute: async (args) => {
    return await checkWarrantyPolicy(args);
  },
});

// 6. Get Active Coupons Tool
toolRegistry.register({
  name: 'get_active_coupons',
  description: 'Lấy danh sách mã giảm giá, khuyến mãi đang có hiệu lực.',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async () => {
    return await getActiveCoupons();
  },
});

// 7. Get Sales Report (Executive Admin Tool for Boss / Robot)
toolRegistry.register({
  name: 'get_sales_report',
  description: 'Tra cứu báo cáo doanh thu, số lượng đơn hàng, lợi nhuận, top sản phẩm bán chạy của Shop of BOW (Dành riêng cho Quản trị viên / Chủ nhân).',
  parameters: {
    type: 'object',
    properties: {
      timeframe: {
        type: 'string',
        description: 'Khoảng thời gian cần báo cáo: "today", "yesterday", "this_week", "last_week", "this_month", hoặc "all_time". Mặc định là "today".',
      },
    },
  },
  execute: async (args, context) => {
    // RBAC: Chặn người dùng thường trên Web
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || (context as any)?.isAdmin === true;
    if (!isAuthorized) {
      return {
        success: false,
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền truy cập báo cáo doanh thu nội bộ của shop.',
      };
    }

    const adapter = getActiveShopAdapter();
    if (!adapter.admin) {
      return { success: false, error: 'ADMIN_PROVIDER_UNAVAILABLE: Nhà cung cấp dữ liệu quản trị chưa sẵn sàng.' };
    }

    const report = await adapter.admin.getSalesReport(args?.timeframe || 'today');
    return {
      success: true,
      data: report,
      summary: `Doanh thu ${report.timeframe}: ${report.totalRevenue.toLocaleString('vi-VN')}đ với ${report.totalOrders} đơn hàng. Tỷ lệ tăng trưởng ${report.growthRatePercent || 0}%.`,
    };
  },
});

// 8. Get Inventory Health (Executive Stock Tool for Boss / Robot / Admin)
toolRegistry.register({
  name: 'get_inventory_health',
  description: 'Kiểm tra tình trạng tồn kho, số slot còn lại của các sản phẩm và cảnh báo sắp hết hàng (Dành riêng cho Quản trị viên / Chủ nhân).',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (_args, context) => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || (context as any)?.isAdmin === true;
    if (!isAuthorized) {
      return {
        success: false,
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền kiểm tra trạng thái kho hàng nội bộ.',
      };
    }

    const adapter = getActiveShopAdapter();
    if (!adapter.admin) {
      return { success: false, error: 'ADMIN_PROVIDER_UNAVAILABLE: Nhà cung cấp dữ liệu quản trị chưa sẵn sàng.' };
    }

    const inventory = await adapter.admin.getInventoryHealth();
    return {
      success: true,
      data: inventory,
      summary: `Tồn kho: ${inventory.healthySkus}/${inventory.totalSkus} SKU an toàn. Có ${inventory.lowStockSkus} SKU cần bổ sung gấp.`,
    };
  },
});

// 9. Manage Shop Vouchers (Admin Tool for Creating Discounts)
toolRegistry.register({
  name: 'manage_shop_vouchers',
  description: 'Tạo mã khuyến mãi / voucher mới cho Shop of BOW (Dành riêng cho Quản trị viên / Chủ shop).',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Mã voucher (vd: "BOWSALE20", "CHAOHE50")' },
      discountPercent: { type: 'number', description: 'Phần trăm giảm giá (vd: 20 cho 20%)' },
      discountAmount: { type: 'number', description: 'Số tiền giảm cố định (vd: 50000)' },
      minOrderValue: { type: 'number', description: 'Giá trị đơn hàng tối thiểu để áp dụng voucher' },
      description: { type: 'string', description: 'Mô tả chương trình khuyến mãi' },
    },
    required: ['code'],
  },
  execute: async (args, context) => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || (context as any)?.isAdmin === true;
    if (!isAuthorized) {
      return {
        success: false,
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền tạo hoặc quản lý mã voucher của shop.',
      };
    }

    const adapter = getActiveShopAdapter();
    if (!adapter.admin?.createVoucher) {
      return { success: false, error: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng tạo voucher chưa sẵn sàng.' };
    }

    const result = await adapter.admin.createVoucher({
      code: args.code,
      discountPercent: args.discountPercent,
      discountAmount: args.discountAmount,
      minOrderValue: args.minOrderValue,
      description: args.description,
    });

    return {
      success: result.success,
      data: result,
      summary: result.message,
    };
  },
});

// 10. Inspect Order Dispute (Admin Tool for Resolving Warranty & Customer Issues)
toolRegistry.register({
  name: 'inspect_order_dispute',
  description: 'Tra cứu thông tin chi tiết đơn hàng lỗi, tài khoản bảo hành để giải quyết khiếu nại của khách hàng (Dành riêng cho Quản trị viên / Chủ shop).',
  parameters: {
    type: 'object',
    properties: {
      identifier: { type: 'string', description: 'Mã đơn hàng, số điện thoại, hoặc email của khách hàng' },
    },
    required: ['identifier'],
  },
  execute: async (args, context) => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || (context as any)?.isAdmin === true;
    if (!isAuthorized) {
      return {
        success: false,
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền tra cứu thông tin khiếu nại đơn hàng.',
      };
    }

    const adapter = getActiveShopAdapter();
    if (!adapter.admin?.inspectOrderDispute) {
      return { success: false, error: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng tra cứu đơn hàng lỗi chưa sẵn sàng.' };
    }

    const dispute = await adapter.admin.inspectOrderDispute(args.identifier);
    return {
      success: true,
      data: dispute,
      summary: `Đơn ${dispute.orderId} của khách ${dispute.customerName} (${dispute.productName}): ${dispute.recommendedAction}`,
    };
  },
});

// 11. Get Pending Fulfillment Queue (On-Demand Procurement & Handover Queue)
toolRegistry.register({
  name: 'get_pending_fulfillment_queue',
  description: 'Kiểm tra danh sách các đơn hàng khách đã thanh toán đang chờ Admin nhập hàng từ đối tác và bàn giao (Dành riêng cho Quản trị viên / Chủ shop).',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (_args, context) => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || (context as any)?.isAdmin === true;
    if (!isAuthorized) {
      return {
        success: false,
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền xem hàng đợi bàn giao đơn hàng của shop.',
      };
    }

    const adapter = getActiveShopAdapter();
    if (!adapter.admin?.getPendingFulfillmentQueue) {
      return { success: false, error: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng xem hàng đợi đơn hàng chưa sẵn sàng.' };
    }

    const queue = await adapter.admin.getPendingFulfillmentQueue();
    return {
      success: true,
      data: queue,
      summary: `Hàng đợi: Có ${queue.totalPendingCount} đơn chờ bàn giao (trong đó có ${queue.urgentCount} đơn chờ > 15 phút cần xử lý gấp).`,
    };
  },
});

// 12. Fulfill Order Handover (One-Click Account / Key Handover)
toolRegistry.register({
  name: 'fulfill_order_handover',
  description: 'Gán thông tin tài khoản hoặc key bản quyền vừa nhập từ đối tác cho đơn hàng và bàn giao cho khách (Dành riêng cho Quản trị viên / Chủ shop).',
  parameters: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'Mã đơn hàng cần bàn giao (vd: "BOW-ORD-8812")' },
      accountDetails: { type: 'string', description: 'Thông tin tài khoản/key bàn giao (vd: "email: user@gmail.com | pass: 123456 | profile: 2")' },
      supplierCost: { type: 'number', description: 'Giá vốn nhập hàng từ đối tác để tính lợi nhuận ròng' },
    },
    required: ['orderId', 'accountDetails'],
  },
  execute: async (args, context) => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || (context as any)?.isAdmin === true;
    if (!isAuthorized) {
      return {
        success: false,
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền thực hiện bàn giao đơn hàng.',
      };
    }

    const adapter = getActiveShopAdapter();
    if (!adapter.admin?.fulfillOrderHandover) {
      return { success: false, error: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng bàn giao đơn hàng chưa sẵn sàng.' };
    }

    const result = await adapter.admin.fulfillOrderHandover({
      orderId: args.orderId,
      accountDetails: args.accountDetails,
      supplierCost: args.supplierCost,
    });

    return {
      success: result.success,
      data: result,
      summary: result.message,
    };
  },
});

// 13. Get Profit Margin Report (Revenue Minus Supplier Cost)
toolRegistry.register({
  name: 'get_profit_margin_report',
  description: 'Báo cáo doanh thu, giá vốn nhập hàng, và lợi nhuận ròng thực tế theo mô hình bán tự động (Dành riêng cho Quản trị viên / Chủ shop).',
  parameters: {
    type: 'object',
    properties: {
      timeframe: { type: 'string', description: 'Khoảng thời gian: "today", "yesterday", "this_week", "this_month", "all_time"' },
    },
  },
  execute: async (args, context) => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || (context as any)?.isAdmin === true;
    if (!isAuthorized) {
      return {
        success: false,
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền xem báo cáo lợi nhuận ròng.',
      };
    }

    const adapter = getActiveShopAdapter();
    if (!adapter.admin?.getProfitMarginReport) {
      return { success: false, error: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng báo cáo lợi nhuận chưa sẵn sàng.' };
    }

    const report = await adapter.admin.getProfitMarginReport(args?.timeframe || 'today');
    return {
      success: true,
      data: report,
      summary: `Lợi nhuận ròng ${report.timeframe}: ${report.netProfit.toLocaleString('vi-VN')}đ (Biên lợi nhuận ${report.profitMarginPercent}%) trên tổng doanh thu ${report.totalRevenue.toLocaleString('vi-VN')}đ (${report.totalFulfilledOrders} đơn hoàn thành).`,
    };
  },
});

export * from '../core/tools.js';



