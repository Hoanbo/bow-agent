export interface LlmChatMessage {
    role: 'user' | 'model' | 'system' | 'function';
    parts: Array<{
        text?: string;
        functionCall?: any;
        functionResponse?: any;
    }>;
}
export interface LlmFunctionCall {
    name: string;
    args: Record<string, any>;
}
export interface LlmResponse {
    success: boolean;
    text?: string;
    functionCalls?: LlmFunctionCall[];
    rawResponse?: any;
    error?: string;
}
export interface LlmProvider {
    /**
     * Check if the LLM provider is configured and available (e.g. valid API key)
     */
    isConfigured(): boolean;
    /**
     * Get the active model identifier
     */
    getModelName(): string;
    /**
     * Send a prompt or conversation history to the model
     */
    sendMessage(userText: string, history?: LlmChatMessage[], functionDeclarations?: any[]): Promise<LlmResponse>;
}
