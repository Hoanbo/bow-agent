import type { AgentContext, AgentMessage, AgentAction } from '../core/types.js';
import { type GeminiToolExecutionOutput } from './geminiTools.js';
/**
 * Reset lịch sử hội thoại khi người dùng làm mới phiên
 */
export declare function resetGeminiHistory(): void;
/**
 * Xử lý tin nhắn người dùng bằng BOW Agent V3 (Gemini Brain)
 */
export declare function processAgentMessageWithGemini(userText: string, context: AgentContext): Promise<{
    success: boolean;
    message?: AgentMessage;
    error?: any;
}>;
/**
 * Tổng hợp UI Action Card & Gợi ý từ kết quả thực thi Tool an toàn
 */
export declare function synthesizeActionsAndSuggestions(toolOutputs: GeminiToolExecutionOutput[], context: AgentContext, userText: string, sessionId: string): {
    actions: AgentAction[];
    primaryAction?: AgentAction;
    suggestions: string[];
    responseData?: any;
};
