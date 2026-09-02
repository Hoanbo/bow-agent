// src/gateway/telegramGateway.ts
// BOW CON V4.0 — MOBILE TELEGRAM VIP GATEWAY FOR THE BOSS

import { processAgentMessage } from '../core/engine.js';
import { globalMorningBriefing } from '../embodied/morningBriefingService.js';

export interface TelegramInboundMessage {
  chatId: string;
  senderName: string;
  text: string;
  isVoiceNote?: boolean;
}

export interface TelegramOutboundResponse {
  chatId: string;
  replyText: string;
  delivered: boolean;
  voiceSynthesized?: boolean;
  timestamp: string;
}

export class TelegramGateway {
  private allowedChatId: string;
  private isConfigured: boolean = false;

  constructor(allowedChatId: string = 'BOSS_VIP_AUTHORIZED_CHAT_ID') {
    this.allowedChatId = allowedChatId;
    if (process.env.BOSS_TELEGRAM_CHAT_ID) {
      this.allowedChatId = process.env.BOSS_TELEGRAM_CHAT_ID;
      this.isConfigured = true;
    }
  }

  public setAllowedChatId(id: string): void {
    this.allowedChatId = id;
    this.isConfigured = true;
  }

  public isAuthorized(chatId: string): boolean {
    // Chỉ chấp nhận chat ID của Sếp
    return chatId === this.allowedChatId || !this.isConfigured;
  }

  /**
   * Xử lý tin nhắn đến từ Telegram của Sếp (Văn bản hoặc Giọng nói Voice Note)
   */
  public async handleIncomingTelegramMessage(msg: TelegramInboundMessage): Promise<TelegramOutboundResponse> {
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
  public async pushMorningBriefingToPhone(targetChatId?: string): Promise<TelegramOutboundResponse> {
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
