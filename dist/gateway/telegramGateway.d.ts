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
export declare class TelegramGateway {
    private allowedChatId;
    private isConfigured;
    constructor(allowedChatId?: string);
    setAllowedChatId(id: string): void;
    isAuthorized(chatId: string): boolean;
    /**
     * Xử lý tin nhắn đến từ Telegram của Sếp (Văn bản hoặc Giọng nói Voice Note)
     */
    handleIncomingTelegramMessage(msg: TelegramInboundMessage): Promise<TelegramOutboundResponse>;
    /**
     * Tự động gửi Bản Tin Sáng vào điện thoại Telegram của Sếp lúc 8:00 sáng
     */
    pushMorningBriefingToPhone(targetChatId?: string): Promise<TelegramOutboundResponse>;
}
export declare const globalTelegramGateway: TelegramGateway;
