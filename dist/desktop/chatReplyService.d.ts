export interface ChatReplyOptions {
    replyText: string;
    targetApp?: 'Facebook' | 'Zalo' | 'Telegram' | 'Browser' | string;
    recipientName?: string;
}
export interface ChatReplyResult {
    success: boolean;
    targetApp: string;
    replyText: string;
    recipientName?: string;
    message: string;
    timestamp: string;
}
export declare class ChatReplyService {
    /**
     * Execute chat reply on the active desktop application via keyboard simulation
     */
    sendChatReply(options: ChatReplyOptions): Promise<ChatReplyResult>;
}
export declare const chatReplyService: ChatReplyService;
