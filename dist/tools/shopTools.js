// src/tools/shopTools.ts
// BOW AGENT V3.3 — E-COMMERCE & SHOP OF BOW AGENT PLUGINS
import { toolRegistry } from './registry.js';
import { searchProducts, getMyOrders, getMyWalletBalance, checkWarrantyPolicy, getActiveCoupons, } from '../core/tools.js';
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
export * from '../core/tools.js';
