// src/tools/desktopTools.ts
// BOW AGENT V3.3 — DESKTOP AUTOMATION & COMPUTER CONTROL TOOLS (bow-remote-agent)
import { toolRegistry } from './registry.js';
import { verifyChannelAccess } from '../core/security.js';
// 1. Launch Application Tool
toolRegistry.register({
    name: 'desktop_launch_app',
    description: 'Mở một ứng dụng trên máy tính (VD: chrome, notepad, calculator, cmd).',
    parameters: {
        type: 'object',
        properties: {
            appName: { type: 'string', description: 'Tên hoặc đường dẫn ứng dụng cần mở' },
            args: { type: 'array', items: { type: 'string' }, description: 'Tham số khởi chạy' },
        },
        required: ['appName'],
    },
    execute: async (args, context) => {
        if (!verifyChannelAccess(context || { channel: 'DESKTOP' }, 'DESKTOP_EXEC')) {
            return { success: false, action: 'desktop_launch_app', error: 'UNAUTHORIZED: Desktop execution token invalid or missing.' };
        }
        return {
            success: true,
            action: 'desktop_launch_app',
            payload: { appName: args.appName, args: args.args || [] },
            message: `Đã gửi lệnh mở ứng dụng ${args.appName} tới desktop agent.`,
        };
    },
});
// 2. Keystroke & Typing Tool
toolRegistry.register({
    name: 'desktop_send_keys',
    description: 'Nhập văn bản hoặc gửi phím bấm/tổ hợp phím tới cửa sổ đang active.',
    parameters: {
        type: 'object',
        properties: {
            text: { type: 'string', description: 'Chuỗi văn bản cần gõ' },
            keyCombo: { type: 'string', description: 'Tổ hợp phím đặc biệt (VD: enter, tab, ctrl+c, alt+f4)' },
        },
    },
    execute: async (args, context) => {
        if (!verifyChannelAccess(context || { channel: 'DESKTOP' }, 'DESKTOP_EXEC')) {
            return { success: false, action: 'desktop_send_keys', error: 'UNAUTHORIZED: Desktop execution token invalid or missing.' };
        }
        return {
            success: true,
            action: 'desktop_send_keys',
            payload: { text: args.text, keyCombo: args.keyCombo },
            message: `Đã gửi lệnh phím bấm tới desktop agent.`,
        };
    },
});
// 3. Mouse Click & Move Tool
toolRegistry.register({
    name: 'desktop_mouse_action',
    description: 'Thực hiện thao tác chuột (click, double-click, chuột phải, di chuyển) tại tọa độ x, y.',
    parameters: {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['click', 'double_click', 'right_click', 'move'] },
            x: { type: 'number', description: 'Tọa độ X trên màn hình' },
            y: { type: 'number', description: 'Tọa độ Y trên màn hình' },
        },
        required: ['action', 'x', 'y'],
    },
    execute: async (args, context) => {
        if (!verifyChannelAccess(context || { channel: 'DESKTOP' }, 'DESKTOP_EXEC')) {
            return { success: false, action: 'desktop_mouse_action', error: 'UNAUTHORIZED: Desktop execution token invalid or missing.' };
        }
        return {
            success: true,
            action: 'desktop_mouse_action',
            payload: { mouseAction: args.action, x: args.x, y: args.y },
            message: `Đã gửi thao tác chuột ${args.action} tại (${args.x}, ${args.y}) tới desktop agent.`,
        };
    },
});
// 4. Capture Screenshot Tool
toolRegistry.register({
    name: 'desktop_capture_screenshot',
    description: 'Chụp ảnh màn hình desktop hiện tại để gửi về Agent phân tích thị giác.',
    parameters: {
        type: 'object',
        properties: {
            screenIndex: { type: 'number', description: 'Chỉ số màn hình (mặc định màn hình chính: 0)' },
        },
    },
    execute: async (args, context) => {
        if (!verifyChannelAccess(context || { channel: 'DESKTOP' }, 'DESKTOP_EXEC')) {
            return { success: false, action: 'desktop_capture_screenshot', error: 'UNAUTHORIZED: Desktop execution token invalid or missing.' };
        }
        return {
            success: true,
            action: 'desktop_capture_screenshot',
            payload: { screenIndex: args?.screenIndex ?? 0 },
            message: 'Đã gửi yêu cầu chụp ảnh màn hình tới desktop agent.',
        };
    },
});
// 5. Inspect Screen Notifications Tool (Mắt Thần Màn Hình for Boss)
toolRegistry.register({
    name: 'inspect_screen_notifications',
    description: 'Chụp ảnh màn hình desktop và sử dụng Gemini Vision để phân tích xem ai vừa nhắn tin Facebook, Zalo, Telegram và tóm tắt nội dung tin nhắn cho Sếp.',
    parameters: {
        type: 'object',
        properties: {
            userQuery: { type: 'string', description: 'Câu hỏi hoặc ứng dụng cần tập trung (vd: "Ai vừa nhắn tin Facebook?")' },
            focusApp: { type: 'string', description: 'Ứng dụng cần ưu tiên kiểm tra (vd: "Facebook", "Zalo", "Telegram")' },
        },
    },
    execute: async (args, context) => {
        const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
        if (!isAuthorized) {
            return {
                success: false,
                action: 'inspect_screen_notifications',
                error: 'FORBIDDEN_ACCESS: Bạn không có quyền truy cập thị giác màn hình của Sếp.',
            };
        }
        const { screenVisionService } = await import('../desktop/screenVisionService.js');
        const result = await screenVisionService.inspectScreenForNotifications({
            userQuery: args?.userQuery,
            focusApp: args?.focusApp,
        });
        return {
            success: result.success,
            action: 'inspect_screen_notifications',
            payload: result,
            message: result.summary,
        };
    },
});
// 6. Voice-to-Chat Reply Message Tool (Reply to Facebook/Zalo/Telegram by Voice)
toolRegistry.register({
    name: 'desktop_reply_message',
    description: 'Tự động nhập và gửi tin nhắn trả lời trên cửa sổ chat Facebook, Zalo, hoặc Telegram đang hoạt động theo lệnh giọng nói của Sếp.',
    parameters: {
        type: 'object',
        properties: {
            replyText: { type: 'string', description: 'Nội dung tin nhắn cần gửi' },
            targetApp: { type: 'string', description: 'Ứng dụng cần gửi: "Facebook", "Zalo", "Telegram", hoặc "Browser"' },
            recipientName: { type: 'string', description: 'Tên người nhận tin nhắn' },
        },
        required: ['replyText'],
    },
    execute: async (args, context) => {
        const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
        if (!isAuthorized) {
            return {
                success: false,
                action: 'desktop_reply_message',
                error: 'FORBIDDEN_ACCESS: Bạn không có quyền gửi tin nhắn từ máy tính của Sếp.',
            };
        }
        const { chatReplyService } = await import('../desktop/chatReplyService.js');
        const result = await chatReplyService.sendChatReply({
            replyText: args.replyText,
            targetApp: args.targetApp,
            recipientName: args.recipientName,
        });
        return {
            success: result.success,
            action: 'desktop_reply_message',
            payload: result,
            message: result.message,
        };
    },
});
// 7. Universal Code Interpreter Tool (Execute Dynamic Code in Sandbox)
toolRegistry.register({
    name: 'desktop_execute_code',
    description: 'Thực thi mã JavaScript/TypeScript động trong môi trường Sandbox an toàn để tính toán, xử lý dữ liệu phức tạp, lọc số liệu hoặc tạo kết quả theo bất kỳ yêu cầu mới nào của Sếp.',
    parameters: {
        type: 'object',
        properties: {
            code: { type: 'string', description: 'Đoạn mã JavaScript/TypeScript cần thực thi' },
            language: { type: 'string', enum: ['javascript', 'typescript', 'js', 'ts'], description: 'Ngôn ngữ lập trình' },
            description: { type: 'string', description: 'Mô tả mục đích của đoạn mã' },
        },
        required: ['code'],
    },
    execute: async (args, context) => {
        const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
        if (!isAuthorized) {
            return {
                success: false,
                action: 'desktop_execute_code',
                error: 'FORBIDDEN_ACCESS: Bạn không có quyền thực thi mã trong Code Sandbox.',
            };
        }
        const { codeSandboxService } = await import('../desktop/codeSandboxService.js');
        const result = await codeSandboxService.executeCode({
            code: args.code,
            language: args.language || 'javascript',
        });
        return {
            success: result.success,
            action: 'desktop_execute_code',
            payload: result,
            message: result.success
                ? `Đã thực thi mã thành công trong ${result.executionTimeMs}ms. Kết quả: ${JSON.stringify(result.result)}`
                : `Thực thi mã thất bại: ${result.error}`,
            error: result.error,
        };
    },
});
// 8. Embodied Smart Home & IoT Automation Tool
toolRegistry.register({
    name: 'desktop_smarthome_control',
    description: 'Điều khiển các thiết bị nhà thông minh và văn phòng của Sếp (bật/tắt đèn bàn, đèn trần, chỉnh nhiệt độ điều hòa, quạt, ổ cắm thông minh).',
    parameters: {
        type: 'object',
        properties: {
            device: { type: 'string', description: 'Tên hoặc loại thiết bị (vd: "desk_light", "air_conditioner", "main_light", "smart_plug")' },
            action: { type: 'string', enum: ['turn_on', 'turn_off', 'set_temperature', 'set_brightness', 'get_status'], description: 'Thao tác điều khiển' },
            value: { type: 'number', description: 'Giá trị cần chỉnh (vd: 25 độ C hoặc 80% độ sáng)' },
        },
        required: ['device', 'action'],
    },
    execute: async (args, context) => {
        const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
        if (!isAuthorized) {
            return {
                success: false,
                action: 'desktop_smarthome_control',
                error: 'FORBIDDEN_ACCESS: Bạn không có quyền điều khiển thiết bị nhà thông minh của Sếp.',
            };
        }
        const { smartHomeService } = await import('../embodied/smartHomeService.js');
        const result = await smartHomeService.executeCommand({
            device: args.device,
            action: args.action,
            value: args.value,
        });
        return {
            success: result.success,
            action: 'desktop_smarthome_control',
            payload: result,
            message: result.message,
        };
    },
});
