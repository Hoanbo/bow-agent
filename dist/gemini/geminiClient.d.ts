import type { AgentContext, AgentMessage, AgentAction } from '../core/types.js';
import { type GeminiToolExecutionOutput } from './geminiTools.js';
import { type MemoryScope } from '../core/memory.js';
export interface GeminiConversationTurn {
    role: 'user' | 'model';
    parts: Array<{
        text: string;
    }>;
}
/**
 * Reset lịch sử hội thoại khi người dùng làm mới phiên
 * In Milestone 1.3.1, clears the session working memory for the given scope without global mutable state.
 */
export declare function resetGeminiHistory(scope?: MemoryScope | string, userId?: string): void;
/**
 * Xử lý tin nhắn người dùng bằng BOW Agent V3 (Gemini Brain)
 */
export declare function processAgentMessageWithGemini(userText: string, context: AgentContext, historyTurns?: GeminiConversationTurn[]): Promise<{
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
