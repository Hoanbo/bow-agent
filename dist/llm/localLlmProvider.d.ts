import type { LlmProvider, LlmChatMessage, LlmResponse } from '../contracts/llmProvider.js';
export declare class LocalLlmProvider implements LlmProvider {
    private localUrl;
    private modelName;
    constructor(localUrl?: string, modelName?: string);
    isConfigured(): boolean;
    getModelName(): string;
    /**
     * Send chat prompt to local model via OpenAI-compatible HTTP API
     */
    sendMessage(userText: string, history?: LlmChatMessage[], functionDeclarations?: any[]): Promise<LlmResponse>;
}
export declare const localLlmProvider: LocalLlmProvider;
