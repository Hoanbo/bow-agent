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
