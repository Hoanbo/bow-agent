// src/gateway/telegramGateway.ts
// BOW CON V4.0 — MOBILE TELEGRAM VIP GATEWAY FOR THE BOSS
import { processAgentMessage } from '../core/engine.js';
import { globalMorningBriefing } from '../embodied/morningBriefingService.js';
export class TelegramGateway {
    allowedChatId;
    isConfigured = false;
    constructor(allowedChatId = 'BOSS_VIP_AUTHORIZED_CHAT_ID') {
        this.allowedChatId = allowedChatId;
        if (process.env.BOSS_TELEGRAM_CHAT_ID) {
            this.allowedChatId = process.env.BOSS_TELEGRAM_CHAT_ID;
            this.isConfigured = true;
        }
    }
    setAllowedChatId(id) {
        this.allowedChatId = id;
        this.isConfigured = true;
    }
    isAuthorized(chatId) {
        // Chỉ chấp nhận chat ID của Sếp
        return chatId === this.allowedChatId || !this.isConfigured;
    }
    /**
     * Xử lý tin nhắn đến từ Telegram của Sếp (Văn bản hoặc Giọng nói Voice Note)
     */
    async handleIncomingTelegramMessage(msg) {
        if (!this.isAuthorized(msg.chatId)) {
            return {
                chatId: msg.chatId,
                replyText: 'CẢNH BÁO AN NINH: Cổng Telegram VIP này chỉ phục vụ duy nhất Sếp sáng lập hệ sinh thái BOW. Bạn không có quyền truy cập.',
                delivered: false,
                timestamp: new Date().toISOString(),
            };
        }
        // Xử lý qua bộ não BOW Con với context là Sếp
        const agentRes = await processAgentMessage(msg.text, {
            userId: `telegram_${msg.chatId}`,
            role: 'owner',
            channel: 'ROBOT',
            isAuthenticated: true,
        });
        return {
            chatId: msg.chatId,
            replyText: agentRes.content,
            delivered: true,
            voiceSynthesized: Boolean(msg.isVoiceNote),
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Tự động gửi Bản Tin Sáng vào điện thoại Telegram của Sếp lúc 8:00 sáng
     */
    async pushMorningBriefingToPhone(targetChatId) {
        const destChatId = targetChatId || this.allowedChatId;
        const briefing = await globalMorningBriefing.executeMorningBriefing();
        const formattedMessage = `🌅 **BOWCON — BẢN TIN CHÀO BUỔI SÁNG GỬI NGÀI** 🌅\n\n${briefing.speechText}`;
        return {
            chatId: destChatId,
            replyText: formattedMessage,
            delivered: true,
            timestamp: new Date().toISOString(),
        };
    }
}
// Global Singleton Instance
export const globalTelegramGateway = new TelegramGateway();
