export interface GeminiConfig {
    modelName: string;
    timeoutMs: number;
    maxHistoryTurns: number;
    temperature: number;
    serverProxyUrl: string;
}
export declare const GEMINI_CONFIG: GeminiConfig;
/**
 * Lấy Gemini API Key an toàn
 * Thứ tự ưu tiên:
 * 1. Biến môi trường Vite client-side (cho môi trường dev / test: VITE_GEMINI_API_KEY)
 * 2. Biến môi trường Node / Server-side (nếu chạy SSR hoặc script: GEMINI_API_KEY)
 */
export declare function getGeminiApiKey(): string | null;
/**
 * Kiểm tra xem Gemini Engine có khả dụng không
 */
export declare function isGeminiConfigured(): boolean;
/**
 * Redact và sanitize structured logging cho console
 * Tuyệt đối không để lộ API Key, Secret, Token, Password, Email, SĐT trong console
 */
export declare function sanitizeLogOutput(obj: any, depth?: number): any;
