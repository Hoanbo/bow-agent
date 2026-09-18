// src/services/agent/tools.ts
// Decoupled Agent Tools via Provider Contracts & ShopAdapter
import { checkToolPermission } from './permissions.js';
import { getActiveCommerceProvider } from './commerceRegistry.js';
function getOptionalAdapter() {
    const commerce = getActiveCommerceProvider();
    return commerce?.adapter || null;
}
/**
 * 1. Tool tra cứu danh mục & giá sản phẩm thực tế từ catalog/storage
 */
export async function searchProducts(params, storage) {
    try {
        const adapter = getOptionalAdapter();
        const store = storage || adapter?.storage;
        let products = [];
        if (store?.searchProducts) {
            products = await store.searchProducts(params);
        }
        else if (store?.getProducts) {
            products = await store.getProducts();
        }
        if ((!products || products.length === 0) && adapter?.catalog?.getAllProducts) {
            products = await adapter.catalog.getAllProducts();
        }
        if ((!products || products.length === 0)) {
            const commerce = getActiveCommerceProvider();
            if (commerce.queryCatalog) {
                const entities = await commerce.queryCatalog({ query: params.keyword, category: params.categoryId, limit: params.limit });
                products = entities.map((e) => ({
                    id: e.id,
                    name: e.name,
                    slug: e.id,
                    description: e.description,
                    startingPrice: 0,
                    ...e.metadata,
                }));
            }
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
        const store = storage || getOptionalAdapter()?.storage;
        const orders = store?.getMyOrders ? await store.getMyOrders(params, context.userId) : [];
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
        const store = storage || getOptionalAdapter()?.storage;
        const prompts = store?.searchPromptsLibrary ? await store.searchPromptsLibrary(params) : [];
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
        const store = storage || getOptionalAdapter()?.storage;
        const coupons = store?.getActiveCoupons ? await store.getActiveCoupons() : [];
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
        const adapter = getOptionalAdapter();
        const walletProvider = wallet || adapter?.wallet;
        let bal = 0;
        if (walletProvider) {
            bal = await walletProvider.getBalance(context.userId);
        }
        else {
            const commerce = getActiveCommerceProvider();
            if (commerce.executeCommerceAction) {
                const res = await commerce.executeCommerceAction({ type: 'GET_WALLET_BALANCE', payload: { userId: context.userId } });
                bal = Number(res.result?.balance || 0);
            }
        }
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
        const adapter = getOptionalAdapter();
        const provider = knowledge || adapter?.knowledge;
        const faqs = provider ? await provider.getFaqs({ activeOnly: true }) : [];
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
        const store = storage || getOptionalAdapter()?.storage;
        const channels = store?.getSupportChannels ? await store.getSupportChannels() : null;
        if (channels) {
            return {
                success: true,
                toolName: 'getSupportChannels',
                data: channels,
            };
        }
        return {
            success: true,
            toolName: 'getSupportChannels',
            data: {
                brand: 'Hỗ trợ khách hàng',
                hours: 'Hỗ trợ trực tuyến 24/7',
            },
        };
    }
    catch {
        return {
            success: true,
            toolName: 'getSupportChannels',
            data: {
                brand: 'Hỗ trợ khách hàng',
                hours: 'Hỗ trợ trực tuyến 24/7',
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
        const store = storage || getOptionalAdapter()?.storage;
        const tickets = store?.getTicketsForUser ? await store.getTicketsForUser(context.userId) : [];
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
