// src/services/agent/tools.ts
// Decoupled Agent Tools via Provider Contracts & ShopAdapter
import { checkToolPermission } from './permissions.js';
import { getActiveShopAdapter } from '../contracts/index.js';
/**
 * 1. Tool tra cứu danh mục & giá sản phẩm thực tế từ catalog/storage
 */
export async function searchProducts(params, storage) {
    try {
        const adapter = getActiveShopAdapter();
        const store = storage || adapter.storage;
        let products = [];
        if (store?.searchProducts) {
            products = await store.searchProducts(params);
        }
        else if (store?.getProducts) {
            products = await store.getProducts();
        }
        if ((!products || products.length === 0) && adapter.catalog?.getAllProducts) {
            products = await adapter.catalog.getAllProducts();
        }
        return {
            success: true,
            toolName: 'searchProducts',
            data: products || [],
        };
    }
    catch (err) {
        return { success: false, toolName: 'searchProducts', message: err.message || 'Lỗi truy vấn sản phẩm.' };
    }
}
/**
 * 2. Tool tra cứu đơn hàng của chính khách hàng hiện tại
 */
export async function getMyOrders(params, context, storage) {
    const perm = checkToolPermission('getMyOrders', context);
    if (!perm.allowed) {
        return { success: false, toolName: 'getMyOrders', message: perm.reason };
    }
    try {
        const store = storage || getActiveShopAdapter().storage;
        const orders = await store.getMyOrders(params, context.userId);
        return {
            success: true,
            toolName: 'getMyOrders',
            data: orders || [],
        };
    }
    catch (err) {
        return { success: false, toolName: 'getMyOrders', message: err.message || 'Lỗi truy vấn đơn hàng.' };
    }
}
/**
 * 3. Tool tra cứu chính sách bảo hành
 */
export async function checkWarrantyPolicy(params) {
    return {
        success: true,
        toolName: 'checkWarrantyPolicy',
        data: {
            standardPolicy: 'Tất cả tài khoản & phần mềm tại Shop of BOW đều được BẢO HÀNH 1 ĐỔI 1 hoặc HOÀN TIỀN tương ứng với thời gian chưa sử dụng nếu phát sinh lỗi kỹ thuật từ nhà cung cấp.',
            responseTime: 'Hỗ trợ xử lý bảo hành trong vòng 5 - 30 phút (Hỗ trợ 24/7).',
            warrantySteps: [
                '1. Đăng nhập và truy cập trang Đơn hàng của tôi (dashboard)',
                '2. Chọn đơn hàng bị sự cố và xem thông tin tài khoản',
                '3. Bấm "Yêu cầu hỗ trợ" hoặc nhắn tin trực tiếp qua Zalo Admin kèm Mã thanh toán (VD: BOW-XXXXX)',
            ],
            productMentioned: params.productName || 'Tất cả sản phẩm',
        },
    };
}
/**
 * 4. Tool tra cứu thư viện Prompt AI
 */
export async function searchPromptsLibrary(params, storage) {
    try {
        const store = storage || getActiveShopAdapter().storage;
        const prompts = await store.searchPromptsLibrary(params);
        return {
            success: true,
            toolName: 'searchPromptsLibrary',
            data: prompts || [],
        };
    }
    catch (err) {
        return { success: false, toolName: 'searchPromptsLibrary', message: err.message || 'Lỗi truy vấn thư viện prompt.' };
    }
}
/**
 * 5. Tool tra cứu mã giảm giá đang kích hoạt
 */
export async function getActiveCoupons(storage) {
    try {
        const store = storage || getActiveShopAdapter().storage;
        const coupons = await store.getActiveCoupons();
        return {
            success: true,
            toolName: 'getActiveCoupons',
            data: coupons || [],
        };
    }
    catch (err) {
        return { success: false, toolName: 'getActiveCoupons', message: err.message || 'Lỗi tra cứu mã giảm giá.' };
    }
}
/**
 * 6. Tool tra cứu số dư ví của khách hàng
 */
export async function getMyWalletBalance(context, wallet) {
    const perm = checkToolPermission('getMyWalletBalance', context);
    if (!perm.allowed) {
        return { success: false, toolName: 'getMyWalletBalance', message: perm.reason };
    }
    try {
        const walletProvider = wallet || getActiveShopAdapter().wallet;
        const bal = await walletProvider.getBalance(context.userId);
        return {
            success: true,
            toolName: 'getMyWalletBalance',
            data: {
                balance: bal,
                formatted: `${bal.toLocaleString('vi-VN')}đ`,
            },
        };
    }
    catch (err) {
        return { success: false, toolName: 'getMyWalletBalance', message: err.message || 'Lỗi tra cứu số dư ví.' };
    }
}
/**
 * 7. Tool tra cứu FAQs & Hướng dẫn sử dụng
 */
export async function getFaqsAndGuides(params, knowledge) {
    try {
        const provider = knowledge || getActiveShopAdapter().knowledge;
        const faqs = await provider.getFaqs({ activeOnly: true });
        let filtered = faqs;
        if (params.query && params.query.trim().length > 0) {
            const q = params.query.trim().toLowerCase();
            filtered = faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
        }
        return {
            success: true,
            toolName: 'getFaqsAndGuides',
            data: filtered.slice(0, 6),
        };
    }
    catch (err) {
        return { success: false, toolName: 'getFaqsAndGuides', message: err.message || 'Lỗi tra cứu FAQ.' };
    }
}
/**
 * 8. Tool tra cứu thông tin hỗ trợ trực tiếp
 */
export async function getSupportChannels(storage) {
    try {
        const store = storage || getActiveShopAdapter().storage;
        const channels = await store.getSupportChannels();
        return {
            success: true,
            toolName: 'getSupportChannels',
            data: channels,
        };
    }
    catch {
        return {
            success: true,
            toolName: 'getSupportChannels',
            data: {
                brand: 'Shop of BOW',
                hotline: '0966 821 315',
                zalo: 'https://zalo.me/0966821315',
                facebook: 'https://www.facebook.com/Bobowcon',
                hours: 'Hỗ trợ 24/7 (Phản hồi nhanh nhất: 8h00 - 23h30 hàng ngày)',
            },
        };
    }
}
/**
 * 9. Tool tra cứu Phiếu hỗ trợ (Ticket) của khách hàng
 */
export async function getMyTickets(params, context, storage) {
    const perm = checkToolPermission('getMyTickets', context);
    if (!perm.allowed) {
        return { success: false, toolName: 'getMyTickets', message: perm.reason };
    }
    try {
        const store = storage || getActiveShopAdapter().storage;
        const tickets = await store.getTicketsForUser(context.userId);
        let filtered = tickets || [];
        if (params.status && params.status !== 'all') {
            filtered = filtered.filter((t) => t.status === params.status);
        }
        return {
            success: true,
            toolName: 'getMyTickets',
            data: filtered.slice(0, params.limit || 6),
        };
    }
    catch (err) {
        return { success: false, toolName: 'getMyTickets', message: err.message || 'Lỗi tra cứu ticket hỗ trợ.' };
    }
}
