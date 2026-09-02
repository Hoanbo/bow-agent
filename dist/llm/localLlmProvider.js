// src/llm/localLlmProvider.ts
// BOW AGENT V3.4 — LOCAL SLM ADAPTER (QWEN 2.5 ON AMD RX 580 VULKAN / CPU)
//
// Implements LlmProvider contract for local offline reasoning.
// Connects to local OpenAI-compatible endpoints (Ollama, Llama.cpp Vulkan, vLLM)
// with built-in zero-downtime offline fallback reasoning.
import { CONFIG } from '../config.js';
import { fastPathRouter } from '../core/fastPathRouter.js';
export class LocalLlmProvider {
    localUrl;
    modelName;
    constructor(localUrl, modelName) {
        this.localUrl = localUrl || CONFIG.localLlmUrl;
        this.modelName = modelName || CONFIG.localLlmModel;
    }
    isConfigured() {
        return Boolean(this.localUrl);
    }
    getModelName() {
        return this.modelName;
    }
    /**
     * Send chat prompt to local model via OpenAI-compatible HTTP API
     */
    async sendMessage(userText, history, functionDeclarations) {
        const endpoint = `${this.localUrl.replace(/\/$/, '')}/chat/completions`;
        // Format conversation history for standard local endpoint
        const messages = (history || []).map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.parts.map(p => p.text || '').join(' '),
        }));
        messages.push({ role: 'user', content: userText });
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages,
                    temperature: 0.2,
                    stream: false,
                }),
            });
            if (!response.ok) {
                throw new Error(`Local SLM endpoint status: ${response.status}`);
            }
            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return {
                success: true,
                text: content,
                rawResponse: data,
            };
        }
        catch {
            // Offline fallback: Use deterministic fast-path or rule engine
            const fastResult = fastPathRouter.evaluate(userText);
            if (fastResult.matched && fastResult.textResponse) {
                return {
                    success: true,
                    text: fastResult.textResponse,
                    rawResponse: { mode: 'local_deterministic_fast_path' },
                };
            }
            return {
                success: true,
                text: `[LOCAL_SLM_OFFLINE] Dạ Sếp, em đang chạy trên mô hình cục bộ ${this.modelName} (AMD RX 580 Vulkan). Em đã ghi nhận yêu cầu: "${userText}".`,
                rawResponse: { mode: 'local_fallback_heuristic' },
            };
        }
    }
}
export const localLlmProvider = new LocalLlmProvider();
