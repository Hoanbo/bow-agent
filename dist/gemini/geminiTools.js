// src/services/agent/gemini/geminiTools.ts
// Tool declarations and deterministic execution bridge for BOW Agent V3
import { SchemaType } from '@google/generative-ai';
import { searchProducts, getMyWalletBalance, getMyOrders, getActiveCoupons, checkWarrantyPolicy, getSupportChannels, getFaqsAndGuides, getMyTickets, } from '../core/tools.js';
import { resolveProductQuery } from '../core/productResolver.js';
import { detectPluralDiscoveryIntent } from '../core/intentResolver.js';
import { findRelevantWarrantyOrder } from '../core/actionPlanner.js';
import { rememberOrderContext } from '../core/sessionContext.js';
import { getActiveShopAdapter } from '../contracts/shopAdapter.js';
/**
 * 1. Khai báo Function Declarations (Tools) cho Gemini
 */
export const geminiToolDeclarations = [
    {
        name: 'get_sales_report',
        description: 'Tra cứu báo cáo kinh doanh, doanh thu, lợi nhuận, số lượng đơn hàng, top sản phẩm bán chạy của Shop of BOW (Dành riêng cho Quản trị viên / Chủ nhân).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                timeframe: {
                    type: SchemaType.STRING,
                    description: 'Khoảng thời gian: "today", "yesterday", "this_week", "last_week", "this_month", hoặc "all_time".',
                },
            },
        },
    },
    {
        name: 'get_inventory_health',
        description: 'Kiểm tra tồn kho các sản phẩm, số slot còn lại, và các SKU sắp hết hàng cần nhập gấp (Dành riêng cho Quản trị viên / Chủ nhân).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: 'manage_shop_vouchers',
        description: 'Tạo mã khuyến mãi / voucher giảm giá mới cho Shop of BOW (Dành riêng cho Quản trị viên / Chủ shop).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                code: {
                    type: SchemaType.STRING,
                    description: 'Mã voucher (vd: "BOWSALE20", "CHAOHE50").',
                },
                discountPercent: {
                    type: SchemaType.NUMBER,
                    description: 'Phần trăm giảm giá (vd: 20 cho 20%).',
                },
                discountAmount: {
                    type: SchemaType.NUMBER,
                    description: 'Số tiền giảm cố định (vd: 50000).',
                },
                minOrderValue: {
                    type: SchemaType.NUMBER,
                    description: 'Giá trị đơn hàng tối thiểu để áp dụng voucher.',
                },
                description: {
                    type: SchemaType.STRING,
                    description: 'Mô tả chương trình khuyến mãi.',
                },
            },
            required: ['code'],
        },
    },
    {
        name: 'inspect_order_dispute',
        description: 'Tra cứu thông tin chi tiết đơn hàng lỗi, tài khoản bảo hành để giải quyết khiếu nại của khách hàng (Dành riêng cho Quản trị viên / Chủ shop).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                identifier: {
                    type: SchemaType.STRING,
                    description: 'Mã đơn hàng, số điện thoại, hoặc email của khách hàng.',
                },
            },
            required: ['identifier'],
        },
    },
    {
        name: 'get_pending_fulfillment_queue',
        description: 'Kiểm tra danh sách các đơn hàng khách đã thanh toán đang chờ Admin nhập hàng từ đối tác và bàn giao (Dành riêng cho Quản trị viên / Chủ shop).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: 'fulfill_order_handover',
        description: 'Gán thông tin tài khoản hoặc key bản quyền vừa nhập từ đối tác cho đơn hàng và bàn giao cho khách (Dành riêng cho Quản trị viên / Chủ shop).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                orderId: {
                    type: SchemaType.STRING,
                    description: 'Mã đơn hàng cần bàn giao (vd: "BOW-ORD-8812").',
                },
                accountDetails: {
                    type: SchemaType.STRING,
                    description: 'Thông tin tài khoản/key bàn giao (vd: "email: user@gmail.com | pass: 123456 | profile: 2").',
                },
                supplierCost: {
                    type: SchemaType.NUMBER,
                    description: 'Giá vốn nhập hàng từ đối tác để tính lợi nhuận ròng.',
                },
            },
            required: ['orderId', 'accountDetails'],
        },
    },
    {
        name: 'get_profit_margin_report',
        description: 'Báo cáo doanh thu, giá vốn nhập hàng, và lợi nhuận ròng thực tế theo mô hình bán tự động (Dành riêng cho Quản trị viên / Chủ shop).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                timeframe: {
                    type: SchemaType.STRING,
                    description: 'Khoảng thời gian: "today", "yesterday", "this_week", "this_month", "all_time".',
                },
            },
        },
    },
    {
        name: 'inspect_screen_notifications',
        description: 'Chụp ảnh màn hình desktop hiện tại và dùng Gemini Vision để kiểm tra xem ai vừa nhắn tin Facebook, Zalo, Telegram hoặc đọc thông báo trên màn hình cho Sếp.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                userQuery: {
                    type: SchemaType.STRING,
                    description: 'Mục tiêu kiểm tra (vd: "Ai vừa nhắn tin Facebook?", "Màn hình đang báo lỗi gì?", "Đọc tin nhắn mới")',
                },
                focusApp: {
                    type: SchemaType.STRING,
                    description: 'Ứng dụng cần ưu tiên kiểm tra: "Facebook", "Zalo", "Telegram", "Gmail".',
                },
            },
        },
    },
    {
        name: 'desktop_reply_message',
        description: 'Tự động gửi tin nhắn trả lời trên cửa sổ chat Facebook Messenger, Zalo, hoặc Telegram đang mở theo lệnh giọng nói của Sếp.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                replyText: {
                    type: SchemaType.STRING,
                    description: 'Nội dung tin nhắn cần gửi trả lời.',
                },
                targetApp: {
                    type: SchemaType.STRING,
                    description: 'Ứng dụng cần gửi: "Facebook", "Zalo", "Telegram".',
                },
                recipientName: {
                    type: SchemaType.STRING,
                    description: 'Tên người nhận tin nhắn nếu có.',
                },
            },
            required: ['replyText'],
        },
    },
    {
        name: 'desktop_execute_code',
        description: 'Thực thi mã JavaScript/TypeScript trong Sandbox an toàn để tính toán, lọc dữ liệu phức tạp hoặc tạo kết quả theo bất kỳ yêu cầu mới nào của Sếp mà không cần tạo tool trước.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                code: {
                    type: SchemaType.STRING,
                    description: 'Đoạn mã JavaScript/TypeScript hoàn chỉnh cần thực thi (vd: console.log(...) hoặc return ...).',
                },
                description: {
                    type: SchemaType.STRING,
                    description: 'Mô tả ngắn gọn mục đích của đoạn mã.',
                },
            },
            required: ['code'],
        },
    },
    {
        name: 'desktop_smarthome_control',
        description: 'Điều khiển các thiết bị nhà thông minh và văn phòng của Sếp (bật/tắt đèn bàn, đèn trần, chỉnh nhiệt độ điều hòa, quạt, ổ cắm thông minh).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                device: {
                    type: SchemaType.STRING,
                    description: 'Tên hoặc loại thiết bị: "desk_light", "air_conditioner", "main_light", "smart_plug".',
                },
                action: {
                    type: SchemaType.STRING,
                    description: 'Hành động: "turn_on", "turn_off", "set_temperature", "set_brightness", "get_status".',
                },
                value: {
                    type: SchemaType.NUMBER,
                    description: 'Giá trị nếu có (vd: 25 độ C hoặc 80% độ sáng).',
                },
            },
            required: ['device', 'action'],
        },
    },
    {
        name: 'search_products',
        description: 'Tìm kiếm sản phẩm trong kho của Shop of BOW theo từ khóa, nhu cầu sử dụng, hoặc danh mục.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                keyword: {
                    type: SchemaType.STRING,
                    description: 'Từ khóa tên sản phẩm (vd: "netflix", "canva", "chatgpt") hoặc nhu cầu (vd: "nghe nhạc", "xem phim", "dựng video", "học tiếng anh", "code").',
                },
                type: {
                    type: SchemaType.STRING,
                    description: 'Loại sản phẩm nếu có: "ai-tool", "premium-app", hoặc "product".',
                },
                limit: {
                    type: SchemaType.NUMBER,
                    description: 'Số lượng sản phẩm tối đa cần lấy (mặc định 6).',
                },
            },
        },
    },
    {
        name: 'get_product_detail',
        description: 'Lấy chi tiết bảng giá, tất cả các gói cước (plans), tính năng và chính sách bảo hành của một sản phẩm cụ thể.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                productIdOrSlug: {
                    type: SchemaType.STRING,
                    description: 'ID hoặc Slug hoặc Tên của sản phẩm (vd: "spotify-premium", "netflix-premium", "chatgpt-plus", "super-duolingo").',
                },
            },
            required: ['productIdOrSlug'],
        },
    },
    {
        name: 'get_user_wallet',
        description: 'Kiểm tra số dư thực tế trong ví của người dùng hiện tại trên hệ thống.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_user_orders',
        description: 'Tra cứu danh sách đơn hàng đã mua, mã thanh toán, trạng thái đơn, và tài khoản cấp của người dùng.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                paymentCode: {
                    type: SchemaType.STRING,
                    description: 'Mã đơn hàng hoặc mã thanh toán cần tra cứu (vd: "BOW-XXXXX").',
                },
                productName: {
                    type: SchemaType.STRING,
                    description: 'Tên sản phẩm trong đơn hàng cần lọc.',
                },
                status: {
                    type: SchemaType.STRING,
                    description: 'Trạng thái đơn: "completed", "pending", "processing", "expired".',
                },
            },
        },
    },
    {
        name: 'get_active_vouchers',
        description: 'Lấy danh sách các mã giảm giá (voucher / coupon) đang kích hoạt và còn hạn trên Shop of BOW.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_warranty_policy',
        description: 'Tra cứu cam kết chính sách bảo hành 1 đổi 1 và quy trình hỗ trợ kỹ thuật chung của shop.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                productName: {
                    type: SchemaType.STRING,
                    description: 'Tên sản phẩm muốn hỏi chính sách bảo hành (tùy chọn).',
                },
            },
        },
    },
    {
        name: 'request_order_warranty',
        description: 'Kiểm tra và gửi yêu cầu bảo hành hoặc hỗ trợ lỗi cho đơn hàng khi khách hàng báo lỗi, hỏng tài khoản, không đăng nhập được, hoặc yêu cầu bảo hành.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                paymentCode: {
                    type: SchemaType.STRING,
                    description: 'Mã đơn hàng cần bảo hành nếu khách hàng cung cấp (vd: "BOW-XXXXX").',
                },
                productName: {
                    type: SchemaType.STRING,
                    description: 'Tên sản phẩm cần bảo hành nếu khách hàng nhắc đến (vd: "youtube", "netflix").',
                },
                issueDescription: {
                    type: SchemaType.STRING,
                    description: 'Mô tả sự cố hoặc lỗi cần hỗ trợ.',
                },
            },
        },
    },
    {
        name: 'get_support_channels',
        description: 'Lấy thông tin liên hệ trực tiếp với bộ phận chăm sóc khách hàng: Hotline, Zalo Admin, Facebook Fanpage.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_faqs',
        description: 'Tra cứu câu hỏi thường gặp, hướng dẫn đăng nhập, bảo hành, và hướng dẫn thanh toán.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                query: {
                    type: SchemaType.STRING,
                    description: 'Chủ đề hoặc câu hỏi cần tra cứu.',
                },
            },
        },
    },
    {
        name: 'get_my_tickets',
        description: 'Tra cứu các phiếu yêu cầu hỗ trợ hoặc khiếu nại bảo hành của người dùng.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                status: {
                    type: SchemaType.STRING,
                    description: 'Trạng thái ticket: "open", "in_progress", "resolved", "closed", hoặc "all".',
                },
            },
        },
    },
    {
        name: 'desktop_action',
        description: 'Thực hiện các thao tác điều khiển máy tính PC mục tiêu (Computer Automation) thông qua bow-remote-agent: mở ứng dụng (Photoshop, Word, Excel, Chrome, VSCode...), mở website / URL, chụp màn hình, click chuột, gõ phím, chạy lệnh terminal, tắt máy, khởi động lại.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                action: {
                    type: SchemaType.STRING,
                    description: 'Hành động cần thực thi: "open_app", "open_chrome", "open_url", "browser_search", "screenshot", "get_screen_info", "get_windows", "focus_window", "close_app", "mouse_click", "keyboard_type", "terminal_execute", "system_shutdown", "system_restart".',
                },
                target: {
                    type: SchemaType.STRING,
                    description: 'Tên ứng dụng (vd: "Photoshop", "Notepad", "Chrome", "Excel", "calc") hoặc cửa sổ cần thao tác.',
                },
                url: {
                    type: SchemaType.STRING,
                    description: 'Địa chỉ website hoặc URL nếu mở trình duyệt (vd: "https://youtube.com", "https://google.com").',
                },
                query: {
                    type: SchemaType.STRING,
                    description: 'Từ khóa tìm kiếm trên trình duyệt nếu có.',
                },
                text: {
                    type: SchemaType.STRING,
                    description: 'Đoạn văn bản cần gõ phím nếu có.',
                },
                command: {
                    type: SchemaType.STRING,
                    description: 'Lệnh terminal nếu hành động là terminal_execute.',
                },
            },
            required: ['action'],
        },
    },
    {
        name: 'boss_remember_fact',
        description: 'Ghi nhớ sở thích, thói quen sinh hoạt, hoặc dự án công nghệ mới do Sếp chia sẻ.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                category: { type: SchemaType.STRING, description: 'Phân loại: habits, projects, health, preferences' },
                key: { type: SchemaType.STRING, description: 'Tên trường hoặc tên dự án/thói quen' },
                value: { type: SchemaType.STRING, description: 'Chi tiết nội dung cần nhớ' },
            },
            required: ['category', 'key', 'value'],
        },
    },
    {
        name: 'boss_recall_memory',
        description: 'Truy xuất các thông tin ghi nhớ về thói quen, dự án hoặc sức khỏe của Sếp.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                query: { type: SchemaType.STRING, description: 'Từ khóa cần tra cứu' },
            },
        },
    },
    {
        name: 'get_morning_briefing',
        description: 'Lấy bản tin chào buổi sáng tổng hợp tin tức công nghệ AI/Robotics và số liệu Shop hôm qua.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                forceRefresh: { type: SchemaType.BOOLEAN, description: 'Có bắt buộc quét mới lại không' },
            },
        },
    },
    {
        name: 'teach_boss_rule',
        description: 'Ghi nhận một quy tắc ứng xử hoặc hướng dẫn mới do Sếp trực tiếp chỉ dạy.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                instruction: { type: SchemaType.STRING, description: 'Nội dung quy tắc Sếp dạy' },
                category: { type: SchemaType.STRING, description: 'Phân loại quy tắc' },
            },
            required: ['instruction'],
        },
    },
    {
        name: 'create_dynamic_skill',
        description: 'Tự động tạo và đăng ký một kỹ năng mới (tool mới) bằng cách viết mã trong Sandbox.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                skillId: { type: SchemaType.STRING, description: 'ID duy nhất của kỹ năng' },
                name: { type: SchemaType.STRING, description: 'Tên kỹ năng' },
                description: { type: SchemaType.STRING, description: 'Mô tả tác dụng' },
                code: { type: SchemaType.STRING, description: 'Mã JavaScript thực thi nhận (args, context)' },
            },
            required: ['skillId', 'name', 'description', 'code'],
        },
    },
    {
        name: 'execute_dynamic_skill',
        description: 'Thực thi một kỹ năng động đã được học và lưu trong kho kỹ năng.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                skillId: { type: SchemaType.STRING, description: 'ID của kỹ năng' },
                args: { type: SchemaType.OBJECT, description: 'Tham số truyền vào kỹ năng', properties: {} },
            },
            required: ['skillId'],
        },
    },
    {
        name: 'list_dynamic_skills',
        description: 'Xem danh sách toàn bộ các kỹ năng động do AI tự tổng hợp.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: 'switch_ai_brain_mode',
        description: 'Chuyển đổi hoặc xem trạng thái của Kiến Trúc Não Đôi (Cloud Gemini / Local Ollama).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                mode: { type: SchemaType.STRING, description: 'auto, cloud_preferred, local_preferred, local_only, deterministic_only' },
            },
        },
    },
    {
        name: 'delegate_subagent_task',
        description: 'Ủy thác nhiệm vụ cho Agent con chuyên trách (tech_scout, coder_devops, shop_operations, hardware_vision).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                role: { type: SchemaType.STRING, description: 'tech_scout, coder_devops, shop_operations, hardware_vision' },
                goal: { type: SchemaType.STRING, description: 'Mục tiêu cần hoàn thành' },
            },
            required: ['role', 'goal'],
        },
    },
    {
        name: 'robot_track_sound_source',
        description: 'Tự động tính toán góc âm thanh giọng nói và điều khiển servo quay đầu nhìn thẳng vào Sếp.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                micLeftEnergy: { type: SchemaType.NUMBER, description: 'Năng lượng mic trái' },
                micRightEnergy: { type: SchemaType.NUMBER, description: 'Năng lượng mic phải' },
            },
            required: ['micLeftEnergy', 'micRightEnergy'],
        },
    },
    {
        name: 'send_telegram_briefing_to_boss',
        description: 'Gửi Bản Tin Sáng tự động hoặc thông báo khẩn vào điện thoại Telegram của Sếp.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                chatId: { type: SchemaType.STRING, description: 'Chat ID Telegram của Sếp' },
            },
        },
    },
];
/**
 * 2. Cầu nối thực thi Tool an toàn (Deterministic Safe Execution)
 */
export async function executeGeminiTool(toolName, rawArgs, context, requestText) {
    // Chuẩn hóa và làm sạch tham số đầu vào (Argument Sanitization & Hardening)
    const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs) ? rawArgs : {};
    try {
        switch (toolName) {
            case 'search_products': {
                const kw = typeof args.keyword === 'string' ? args.keyword.slice(0, 150).trim() : '';
                const prodType = typeof args.type === 'string' && ['ai-tool', 'premium-app', 'product'].includes(args.type)
                    ? args.type
                    : undefined;
                const limit = typeof args.limit === 'number' && args.limit > 0 && args.limit <= 20 ? args.limit : 8;
                // V3.3 Phase 4.2 — RC-3: detect plural intent from original user context
                // context.userText holds the original query if available, otherwise derive from kw
                const originalQuery = requestText || kw;
                const isPluralQuery = detectPluralDiscoveryIntent(originalQuery);
                let res = await searchProducts({
                    keyword: kw,
                    type: prodType,
                    limit,
                });
                let products = res.data || [];
                // Nếu tìm theo từ khóa literal chưa ra, kích hoạt bộ phân giải ngữ cảnh sản phẩm (7 tầng)
                if ((isPluralQuery || products.length === 0) && originalQuery.length > 0) {
                    const resolved = await resolveProductQuery(originalQuery);
                    if (resolved.candidate && !isPluralQuery) {
                        products = [resolved.candidate];
                    }
                    if (resolved.semanticCandidates && resolved.semanticCandidates.length > 0) {
                        products = resolved.semanticCandidates;
                    }
                    else if (!isPluralQuery && resolved.candidates && resolved.candidates.length > 0) {
                        products = resolved.candidates;
                    }
                }
                // V3.3 Phase 4.2 — RC-3: Plural expansion at tool level
                // If plural discovery and only 1 product found, try category expansion
                if (isPluralQuery && products.length === 1 && products[0].categoryId) {
                    try {
                        const catRes = await searchProducts({ categoryId: products[0].categoryId, limit: 10 });
                        const catProducts = (catRes.data || []).filter(p => p.id !== products[0].id);
                        if (catProducts.length > 0) {
                            // Filter by keyword relevance — require kw substring in name/tagline/aliases
                            const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
                            const kwTokens = kwNorm.split(/\s+/).filter(t => t.length >= 2);
                            const qualifiedExpansion = catProducts.filter(p => {
                                if (kwTokens.length === 0)
                                    return false;
                                const corpus = [
                                    p.name,
                                    p.tagline || '',
                                    ...(p.searchAliases || []),
                                ].join(' ').toLowerCase()
                                    .normalize('NFD')
                                    .replace(/[\u0300-\u036f]/g, '')
                                    .replace(/đ/g, 'd');
                                const matchCount = kwTokens.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(corpus)).length;
                                return matchCount > 0 && matchCount / kwTokens.length >= 0.5;
                            });
                            if (qualifiedExpansion.length > 0) {
                                products = [products[0], ...qualifiedExpansion].slice(0, 6);
                            }
                        }
                    }
                    catch {
                        // Expansion failed silently
                    }
                }
                return {
                    toolName,
                    success: res.success,
                    data: products.map((p) => ({
                        id: p.id,
                        name: p.name,
                        slug: p.slug,
                        categoryName: p.categoryName,
                        startingPrice: p.startingPrice,
                        tagline: p.tagline,
                        plans: p.plans.map((pl) => ({ id: pl.id, name: pl.name, duration: pl.duration, price: pl.price })),
                    })),
                    actionData: {
                        // V3.3 Phase 4.2 — RC-3: type depends on BOTH product count AND user intent
                        type: (isPluralQuery || products.length > 1) ? 'products_list' : 'product_detail',
                        product: (!isPluralQuery && products.length === 1) ? products[0] : undefined,
                        products,
                    },
                };
            }
            case 'get_product_detail': {
                const query = typeof args.productIdOrSlug === 'string' ? args.productIdOrSlug.slice(0, 100).trim() : '';
                if (!query) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'Thiếu tên hoặc ID sản phẩm cần xem chi tiết.',
                    };
                }
                const res = await searchProducts({ keyword: query, limit: 3 });
                let products = res.data || [];
                if (products.length === 0) {
                    const resolved = await resolveProductQuery(query);
                    if (resolved.candidate) {
                        products = [resolved.candidate];
                    }
                    else if (resolved.semanticCandidates && resolved.semanticCandidates.length > 0) {
                        products = resolved.semanticCandidates;
                    }
                }
                const matched = products.find((p) => p.id === query ||
                    p.slug.toLowerCase() === query.toLowerCase() ||
                    p.name.toLowerCase().includes(query.toLowerCase())) || products[0];
                if (matched) {
                    return {
                        toolName,
                        success: true,
                        data: {
                            id: matched.id,
                            name: matched.name,
                            slug: matched.slug,
                            categoryName: matched.categoryName,
                            tagline: matched.tagline,
                            startingPrice: matched.startingPrice,
                            plans: matched.plans.map((pl) => ({
                                id: pl.id,
                                name: pl.name,
                                duration: pl.duration,
                                price: pl.price,
                                isHighlight: pl.isHighlight,
                            })),
                            features: matched.features,
                            warranty: matched.warranty,
                        },
                        actionData: {
                            type: 'product_detail',
                            product: matched,
                        },
                    };
                }
                return {
                    toolName,
                    success: false,
                    data: null,
                    message: `Không tìm thấy sản phẩm "${query}" trong hệ thống Shop of BOW.`,
                };
            }
            case 'get_user_wallet': {
                // Strict Authorization: Chỉ dùng context.userId đã xác thực
                if (!context.isAuthenticated || !context.userId) {
                    return {
                        toolName,
                        success: false,
                        data: {
                            balance: 0,
                            formatted: '0đ',
                            isAuthenticated: false,
                        },
                        message: 'Khách hàng chưa đăng nhập. Vui lòng đăng nhập để kiểm tra số dư ví.',
                    };
                }
                const res = await getMyWalletBalance(context);
                const bal = res.data?.balance || 0;
                return {
                    toolName,
                    success: res.success,
                    data: {
                        balance: bal,
                        formatted: `${bal.toLocaleString('vi-VN')}đ`,
                        isAuthenticated: true,
                    },
                    actionData: {
                        type: 'wallet',
                        balance: bal,
                    },
                };
            }
            case 'get_user_orders': {
                // Strict Authorization: Chỉ dùng context.userId đã xác thực
                if (!context.isAuthenticated || !context.userId) {
                    return {
                        toolName,
                        success: false,
                        data: [],
                        message: 'Khách hàng chưa đăng nhập. Vui lòng đăng nhập để tra cứu lịch sử đơn hàng.',
                    };
                }
                const paymentCode = typeof args.paymentCode === 'string' ? args.paymentCode.slice(0, 50).trim() : undefined;
                const productName = typeof args.productName === 'string' ? args.productName.slice(0, 100).trim() : undefined;
                const status = typeof args.status === 'string' ? args.status.slice(0, 30).trim() : undefined;
                const res = await getMyOrders({
                    paymentCode,
                    status,
                    productName,
                    limit: 6,
                }, context);
                const orders = res.data || [];
                return {
                    toolName,
                    success: res.success,
                    data: orders.map((o) => ({
                        id: o.id,
                        paymentCode: o.payment_code,
                        productName: o.product_name,
                        planLabel: o.plan_label,
                        price: o.price,
                        status: o.status,
                        createdAt: o.created_at,
                        expiresAt: o.expires_at,
                    })),
                    actionData: {
                        type: 'orders',
                        orders,
                    },
                };
            }
            case 'get_active_vouchers': {
                const res = await getActiveCoupons();
                const coupons = res.data || [];
                return {
                    toolName,
                    success: res.success,
                    data: coupons.map((c) => ({
                        code: c.code,
                        name: c.name,
                        description: c.description,
                        discountValue: c.discount_value,
                        discountType: c.discount_type,
                        minOrder: c.minimum_order_amount,
                    })),
                    actionData: {
                        type: 'vouchers',
                        vouchers: coupons,
                    },
                };
            }
            case 'get_warranty_policy': {
                const productName = typeof args.productName === 'string' ? args.productName.slice(0, 100).trim() : undefined;
                const res = await checkWarrantyPolicy({ productName });
                return {
                    toolName,
                    success: res.success,
                    data: res.data,
                };
            }
            case 'request_order_warranty': {
                if (!context.isAuthenticated || !context.userId) {
                    return {
                        toolName,
                        success: false,
                        data: { eligible: false, isAuthenticated: false },
                        message: 'Khách hàng chưa đăng nhập. Vui lòng đăng nhập để yêu cầu bảo hành đơn hàng.',
                    };
                }
                const res = await getMyOrders({ limit: 12 }, context);
                const orders = res.data || [];
                const queryText = [args.paymentCode, args.productName, args.issueDescription, requestText].filter(Boolean).join(' ');
                const relevantOrder = findRelevantWarrantyOrder(orders, queryText);
                if (!relevantOrder) {
                    return {
                        toolName,
                        success: false,
                        data: { eligible: false, orderFound: false },
                        message: args.paymentCode
                            ? `Không tìm thấy đơn hàng mã "${args.paymentCode}" trong tài khoản của bạn.`
                            : 'Không tìm thấy đơn hàng phù hợp trong tài khoản của bạn để bảo hành.',
                    };
                }
                const status = relevantOrder.status;
                if (status === 'cancelled') {
                    return {
                        toolName,
                        success: false,
                        data: { eligible: false, status: 'cancelled', order: relevantOrder },
                        message: `Đơn hàng ${relevantOrder.product_name} (${relevantOrder.payment_code}) đã bị hủy (cancelled) nên không thể tạo yêu cầu bảo hành.`,
                        actionData: {
                            type: 'warranty_rejected',
                            order: relevantOrder,
                            reason: 'ORDER_CANCELLED',
                        },
                    };
                }
                if (status === 'refunded') {
                    return {
                        toolName,
                        success: false,
                        data: { eligible: false, status: 'refunded', order: relevantOrder },
                        message: `Đơn hàng ${relevantOrder.product_name} (${relevantOrder.payment_code}) đã được hoàn tiền (refunded) nên không còn trong phạm vi bảo hành.`,
                        actionData: {
                            type: 'warranty_rejected',
                            order: relevantOrder,
                            reason: 'ORDER_REFUNDED',
                        },
                    };
                }
                if (status === 'pending_payment') {
                    return {
                        toolName,
                        success: false,
                        data: { eligible: false, status: 'pending_payment', order: relevantOrder },
                        message: `Đơn hàng ${relevantOrder.product_name} (${relevantOrder.payment_code}) chưa hoàn tất thanh toán (pending_payment).`,
                        actionData: {
                            type: 'warranty_rejected',
                            order: relevantOrder,
                            reason: 'PENDING_PAYMENT',
                        },
                    };
                }
                // Đơn hàng hợp lệ (completed, processing, pending_delivery)
                rememberOrderContext(relevantOrder);
                return {
                    toolName,
                    success: true,
                    data: {
                        eligible: true,
                        order: {
                            id: relevantOrder.id,
                            paymentCode: relevantOrder.payment_code,
                            productName: relevantOrder.product_name,
                            planLabel: relevantOrder.plan_label,
                            status: relevantOrder.status,
                        },
                        message: `Đơn hàng ${relevantOrder.product_name} (${relevantOrder.payment_code}) hợp lệ để gửi yêu cầu bảo hành.`,
                    },
                    actionData: {
                        type: 'warranty_ticket',
                        order: relevantOrder,
                    },
                };
            }
            case 'get_support_channels': {
                const res = await getSupportChannels();
                return {
                    toolName,
                    success: res.success,
                    data: res.data,
                    actionData: {
                        type: 'support',
                    },
                };
            }
            case 'get_faqs': {
                const query = typeof args.query === 'string' ? args.query.slice(0, 150).trim() : undefined;
                const res = await getFaqsAndGuides({ query });
                return {
                    toolName,
                    success: res.success,
                    data: res.data,
                };
            }
            case 'get_my_tickets': {
                // Strict Authorization: Chỉ dùng context.userId đã xác thực
                if (!context.isAuthenticated || !context.userId) {
                    return {
                        toolName,
                        success: false,
                        data: [],
                        message: 'Khách hàng chưa đăng nhập. Vui lòng đăng nhập để xem ticket hỗ trợ.',
                    };
                }
                const status = typeof args.status === 'string' ? args.status.slice(0, 30).trim() : undefined;
                const res = await getMyTickets({ status, limit: 6 }, context);
                const tickets = res.data || [];
                return {
                    toolName,
                    success: res.success,
                    data: tickets.map((t) => ({
                        id: t.id,
                        ticketNumber: t.ticket_number,
                        subject: t.subject,
                        status: t.status,
                        priority: t.priority,
                        updatedAt: t.updated_at,
                    })),
                    actionData: {
                        type: 'tickets',
                        tickets,
                    },
                };
            }
            case 'get_sales_report': {
                const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.isAdmin === true;
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền xem báo cáo doanh thu nội bộ của Shop of BOW.',
                    };
                }
                const timeframe = typeof args.timeframe === 'string' ? args.timeframe.trim() : 'today';
                const adapter = getActiveShopAdapter();
                if (!adapter.admin) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'ADMIN_PROVIDER_UNAVAILABLE: Nhà cung cấp dữ liệu quản trị chưa sẵn sàng.',
                    };
                }
                const report = await adapter.admin.getSalesReport(timeframe);
                return {
                    toolName,
                    success: true,
                    data: report,
                    message: `Báo cáo doanh thu ${report.timeframe}: ${report.totalRevenue.toLocaleString('vi-VN')}đ, ${report.totalOrders} đơn hàng, tăng trưởng ${report.growthRatePercent || 0}%.`,
                    actionData: {
                        type: 'sales_report',
                        report,
                    },
                };
            }
            case 'get_inventory_health': {
                const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.isAdmin === true;
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền kiểm tra trạng thái tồn kho nội bộ.',
                    };
                }
                const adapter = getActiveShopAdapter();
                if (!adapter.admin) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'ADMIN_PROVIDER_UNAVAILABLE: Nhà cung cấp dữ liệu quản trị chưa sẵn sàng.',
                    };
                }
                const inventory = await adapter.admin.getInventoryHealth();
                return {
                    toolName,
                    success: true,
                    data: inventory,
                    message: `Tồn kho: ${inventory.healthySkus}/${inventory.totalSkus} SKU an toàn. Cần nhập gấp: ${inventory.lowStockSkus} SKU.`,
                    actionData: {
                        type: 'inventory_health',
                        inventory,
                    },
                };
            }
            case 'manage_shop_vouchers': {
                const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.isAdmin === true;
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền tạo hoặc quản lý mã voucher của shop.',
                    };
                }
                const adapter = getActiveShopAdapter();
                if (!adapter.admin?.createVoucher) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng tạo voucher chưa sẵn sàng.',
                    };
                }
                const voucherResult = await adapter.admin.createVoucher({
                    code: typeof args.code === 'string' ? args.code : 'BOW_DISCOUNT',
                    discountPercent: typeof args.discountPercent === 'number' ? args.discountPercent : undefined,
                    discountAmount: typeof args.discountAmount === 'number' ? args.discountAmount : undefined,
                    minOrderValue: typeof args.minOrderValue === 'number' ? args.minOrderValue : undefined,
                    description: typeof args.description === 'string' ? args.description : undefined,
                });
                return {
                    toolName,
                    success: voucherResult.success,
                    data: voucherResult,
                    message: voucherResult.message,
                    actionData: {
                        type: 'shop_voucher',
                        voucher: voucherResult.voucher,
                    },
                };
            }
            case 'inspect_order_dispute': {
                const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.isAdmin === true;
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền tra cứu thông tin khiếu nại đơn hàng.',
                    };
                }
                const adapter = getActiveShopAdapter();
                if (!adapter.admin?.inspectOrderDispute) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng tra cứu đơn hàng lỗi chưa sẵn sàng.',
                    };
                }
                const identifier = typeof args.identifier === 'string' ? args.identifier.trim() : '';
                const disputeResult = await adapter.admin.inspectOrderDispute(identifier);
                return {
                    toolName,
                    success: true,
                    data: disputeResult,
                    message: `Đơn ${disputeResult.orderId} của khách ${disputeResult.customerName} (${disputeResult.productName}): ${disputeResult.recommendedAction}`,
                    actionData: {
                        type: 'order_dispute',
                        dispute: disputeResult,
                    },
                };
            }
            case 'get_pending_fulfillment_queue': {
                const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.isAdmin === true;
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền xem hàng đợi bàn giao đơn hàng của shop.',
                    };
                }
                const adapter = getActiveShopAdapter();
                if (!adapter.admin?.getPendingFulfillmentQueue) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng xem hàng đợi đơn hàng chưa sẵn sàng.',
                    };
                }
                const queueResult = await adapter.admin.getPendingFulfillmentQueue();
                return {
                    toolName,
                    success: true,
                    data: queueResult,
                    message: `Hàng đợi: Có ${queueResult.totalPendingCount} đơn chờ bàn giao (trong đó có ${queueResult.urgentCount} đơn chờ > 15 phút cần xử lý gấp).`,
                    actionData: {
                        type: 'pending_fulfillment',
                        pendingQueue: queueResult,
                    },
                };
            }
            case 'fulfill_order_handover': {
                const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.isAdmin === true;
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền thực hiện bàn giao đơn hàng.',
                    };
                }
                const adapter = getActiveShopAdapter();
                if (!adapter.admin?.fulfillOrderHandover) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng bàn giao đơn hàng chưa sẵn sàng.',
                    };
                }
                const orderId = typeof args.orderId === 'string' ? args.orderId.trim() : '';
                const accountDetails = typeof args.accountDetails === 'string' ? args.accountDetails.trim() : '';
                const supplierCost = typeof args.supplierCost === 'number' ? args.supplierCost : undefined;
                const handoverResult = await adapter.admin.fulfillOrderHandover({
                    orderId,
                    accountDetails,
                    supplierCost,
                });
                return {
                    toolName,
                    success: handoverResult.success,
                    data: handoverResult,
                    message: handoverResult.message,
                    actionData: {
                        type: 'order_handover',
                        handover: handoverResult,
                    },
                };
            }
            case 'get_profit_margin_report': {
                const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.isAdmin === true;
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền xem báo cáo lợi nhuận ròng.',
                    };
                }
                const adapter = getActiveShopAdapter();
                if (!adapter.admin?.getProfitMarginReport) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'ADMIN_PROVIDER_UNAVAILABLE: Chức năng báo cáo lợi nhuận chưa sẵn sàng.',
                    };
                }
                const timeframe = typeof args.timeframe === 'string' ? args.timeframe.trim() : 'today';
                const profitResult = await adapter.admin.getProfitMarginReport(timeframe);
                return {
                    toolName,
                    success: true,
                    data: profitResult,
                    message: `Lợi nhuận ròng ${profitResult.timeframe}: ${profitResult.netProfit.toLocaleString('vi-VN')}đ (Biên lợi nhuận ${profitResult.profitMarginPercent}%) trên tổng doanh thu ${profitResult.totalRevenue.toLocaleString('vi-VN')}đ (${profitResult.totalFulfilledOrders} đơn hoàn thành).`,
                    actionData: {
                        type: 'profit_margin',
                        profitReport: profitResult,
                    },
                };
            }
            case 'inspect_screen_notifications': {
                const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền truy cập thị giác màn hình của Sếp.',
                    };
                }
                const { screenVisionService } = await import('../desktop/screenVisionService.js');
                const result = await screenVisionService.inspectScreenForNotifications({
                    userQuery: typeof args.userQuery === 'string' ? args.userQuery.trim() : undefined,
                    focusApp: typeof args.focusApp === 'string' ? args.focusApp.trim() : undefined,
                });
                return {
                    toolName,
                    success: result.success,
                    data: result,
                    message: result.summary,
                    actionData: {
                        type: 'desktop_action',
                        actionPayload: {
                            action: 'inspect_screen_notifications',
                            visionResult: result,
                        },
                    },
                };
            }
            case 'desktop_reply_message': {
                const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền gửi tin nhắn từ máy tính của Sếp.',
                    };
                }
                const { chatReplyService } = await import('../desktop/chatReplyService.js');
                const replyResult = await chatReplyService.sendChatReply({
                    replyText: typeof args.replyText === 'string' ? args.replyText.trim() : '',
                    targetApp: typeof args.targetApp === 'string' ? args.targetApp.trim() : 'Facebook',
                    recipientName: typeof args.recipientName === 'string' ? args.recipientName.trim() : undefined,
                });
                return {
                    toolName,
                    success: replyResult.success,
                    data: replyResult,
                    message: replyResult.message,
                    actionData: {
                        type: 'desktop_action',
                        actionPayload: {
                            action: 'desktop_reply_message',
                            replyResult,
                        },
                    },
                };
            }
            case 'desktop_execute_code': {
                const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền thực thi mã trong Code Sandbox.',
                    };
                }
                const { codeSandboxService } = await import('../desktop/codeSandboxService.js');
                const sandboxResult = await codeSandboxService.executeCode({
                    code: typeof args.code === 'string' ? args.code : '',
                    language: (typeof args.language === 'string' && ['javascript', 'typescript', 'js', 'ts'].includes(args.language)
                        ? args.language
                        : 'javascript'),
                });
                return {
                    toolName,
                    success: sandboxResult.success,
                    data: sandboxResult,
                    message: sandboxResult.success
                        ? `Thực thi mã thành công trong ${sandboxResult.executionTimeMs}ms. Kết quả: ${JSON.stringify(sandboxResult.result)}`
                        : `Lỗi thực thi mã: ${sandboxResult.error}`,
                    actionData: {
                        type: 'desktop_action',
                        actionPayload: {
                            action: 'desktop_execute_code',
                            sandboxResult,
                        },
                    },
                };
            }
            case 'desktop_smarthome_control': {
                const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
                if (!isAuthorized) {
                    return {
                        toolName,
                        success: false,
                        data: null,
                        message: 'FORBIDDEN_ACCESS: Bạn không có quyền điều khiển thiết bị nhà thông minh của Sếp.',
                    };
                }
                const { smartHomeService } = await import('../embodied/smartHomeService.js');
                const smartResult = await smartHomeService.executeCommand({
                    device: typeof args.device === 'string' ? args.device : 'desk_light',
                    action: (typeof args.action === 'string' ? args.action : 'get_status'),
                    value: typeof args.value === 'number' ? args.value : undefined,
                });
                return {
                    toolName,
                    success: smartResult.success,
                    data: smartResult,
                    message: smartResult.message,
                    actionData: {
                        type: 'desktop_action',
                        actionPayload: {
                            action: 'desktop_smarthome_control',
                            smartResult,
                        },
                    },
                };
            }
            case 'desktop_action': {
                const action = typeof args.action === 'string' ? args.action.trim() : 'open_app';
                const target = typeof args.target === 'string' ? args.target.trim() : undefined;
                const url = typeof args.url === 'string' ? args.url.trim() : undefined;
                const query = typeof args.query === 'string' ? args.query.trim() : undefined;
                const text = typeof args.text === 'string' ? args.text.trim() : undefined;
                const command = typeof args.command === 'string' ? args.command.trim() : undefined;
                const actionPayload = {
                    action,
                    target,
                    url,
                    query,
                    text,
                    command,
                    ...(args || {}),
                };
                return {
                    toolName,
                    success: true,
                    data: {
                        status: 'dispatched',
                        action,
                        target: target || url || command || 'system',
                        payload: actionPayload,
                    },
                    message: `Lệnh điều khiển máy tính "${action}" đã được lên kế hoạch gửi tới bow-remote-agent.`,
                    actionData: {
                        type: 'desktop_action',
                        actionPayload,
                    },
                };
            }
            case 'boss_remember_fact': {
                const { globalBossMemory } = await import('../embodied/bossMemoryHub.js');
                const category = typeof args.category === 'string' ? args.category : 'habits';
                const key = typeof args.key === 'string' ? args.key : 'Sở thích';
                const value = typeof args.value === 'string' ? args.value : '';
                if (category === 'habits') {
                    globalBossMemory.rememberHabit(key, value);
                }
                else if (category === 'projects') {
                    globalBossMemory.addOrUpdateProject({
                        id: 'proj_' + Date.now(),
                        name: key,
                        description: value,
                        techStack: ['Chưa xác định'],
                        status: 'active',
                    });
                }
                return {
                    toolName,
                    success: true,
                    data: { category, key, value },
                    message: `Dạ con đã ghi nhớ thành công: "${key} - ${value}" vào bộ nhớ dài hạn rồi ạ!`,
                };
            }
            case 'boss_recall_memory': {
                const { globalBossMemory } = await import('../embodied/bossMemoryHub.js');
                const profile = globalBossMemory.getProfile();
                return {
                    toolName,
                    success: true,
                    data: profile,
                    message: `Dạ con đã tìm thấy hồ sơ của Sếp: ${profile.name}. Đang theo đuổi ${profile.projects.length} dự án.`,
                };
            }
            case 'get_morning_briefing': {
                const { globalMorningBriefing } = await import('../embodied/morningBriefingService.js');
                const res = await globalMorningBriefing.executeMorningBriefing();
                return {
                    toolName,
                    success: true,
                    data: res,
                    message: res.speechText,
                };
            }
            case 'teach_boss_rule': {
                const { globalBossFeedback } = await import('../embodied/bossFeedbackLearner.js');
                const instruction = typeof args.instruction === 'string' ? args.instruction : '';
                const rule = globalBossFeedback.addRule({
                    pattern: 'Lời Sếp dạy',
                    instruction,
                    category: 'behavior',
                });
                return {
                    toolName,
                    success: true,
                    data: rule,
                    message: `Dạ con đã ghi nhớ vĩnh viễn quy tắc Sếp vừa dạy: "${instruction}". Con sẽ tuân thủ nghiêm túc ạ!`,
                };
            }
            case 'create_dynamic_skill': {
                const { globalSandboxRunner } = await import('../desktop/sandboxRunner.js');
                const res = await globalSandboxRunner.testAndSynthesizeSkill({
                    id: args.skillId,
                    name: args.name,
                    description: args.description,
                    code: args.code,
                    testArgs: args.testArgs || {},
                    author: 'bow_con_synthesized',
                });
                return {
                    toolName,
                    success: res.success,
                    data: res.synthesizedSkill,
                    message: res.debugFeedback,
                };
            }
            case 'execute_dynamic_skill': {
                const { globalSkillManager } = await import('../skills/dynamicSkillManager.js');
                const res = await globalSkillManager.executeSkill(args.skillId, args.args || {}, context);
                return {
                    toolName,
                    success: res.success,
                    data: res.result,
                    message: res.error || `Kỹ năng "${args.skillId}" đã thực thi thành công trong ${res.executionTimeMs}ms.`,
                };
            }
            case 'list_dynamic_skills': {
                const { globalSkillManager } = await import('../skills/dynamicSkillManager.js');
                const skills = globalSkillManager.listSkills();
                return {
                    toolName,
                    success: true,
                    data: skills,
                    message: `Kho hiện có ${skills.length} kỹ năng động đang hoạt động.`,
                };
            }
            case 'switch_ai_brain_mode': {
                const { globalHybridRouter } = await import('../core/hybridModelRouter.js');
                if (args.mode) {
                    globalHybridRouter.setMode(args.mode);
                }
                const status = globalHybridRouter.getStatus();
                return {
                    toolName,
                    success: true,
                    data: status,
                    message: `Chế độ Não Đôi hiện tại: "${status.activeMode}". Quyết định gần nhất: "${status.lastRoutingDecision}".`,
                };
            }
            case 'delegate_subagent_task': {
                const { globalMultiAgentMesh } = await import('../core/multiAgentMesh.js');
                const role = typeof args.role === 'string' ? args.role : 'tech_scout';
                const goal = typeof args.goal === 'string' ? args.goal : 'Thực thi nhiệm vụ';
                const task = await globalMultiAgentMesh.delegateTask(role, goal, args.payload || {});
                return {
                    toolName,
                    success: task.status === 'completed',
                    data: task,
                    message: `Agent con [${role}] đã hoàn thành: "${goal}" trong ${task.executionTimeMs}ms.`,
                };
            }
            case 'robot_track_sound_source': {
                const { globalSoundLocalization } = await import('../embodied/soundLocalization.js');
                const left = typeof args.micLeftEnergy === 'number' ? args.micLeftEnergy : 10;
                const right = typeof args.micRightEnergy === 'number' ? args.micRightEnergy : 10;
                const res = await globalSoundLocalization.trackAndAimHeadAtSound(left, right);
                return {
                    toolName,
                    success: res.success,
                    data: res,
                    message: `Robot đã xoay đầu ${res.targetAngle} độ về hướng ${res.direction} nhìn vào Sếp.`,
                };
            }
            case 'send_telegram_briefing_to_boss': {
                const { globalTelegramGateway } = await import('../gateway/telegramGateway.js');
                const res = await globalTelegramGateway.pushMorningBriefingToPhone(args.chatId);
                return {
                    toolName,
                    success: res.delivered,
                    data: res,
                    message: 'Bản Tin Chào Buổi Sáng đã được gửi vào điện thoại Telegram của Sếp!',
                };
            }
            default:
                return {
                    toolName,
                    success: false,
                    data: null,
                    message: `Tool "${toolName}" không được hỗ trợ trong hệ thống.`,
                };
        }
    }
    catch (err) {
        return {
            toolName,
            success: false,
            data: null,
            message: err?.message || 'Lỗi thực thi tool.',
        };
    }
}
