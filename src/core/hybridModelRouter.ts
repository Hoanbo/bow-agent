// src/core/hybridModelRouter.ts
// BOW CON V4.0 — HYBRID DUAL-BRAIN ROUTER (CLOUD GEMINI + LOCAL PRIVATE BRAIN)

import type { AgentContext, AgentMessage } from './types.js';
import { isCircuitOpen, recordExecutionFailure, recordExecutionSuccess } from '../production/productionCircuitBreaker.js';

export type BrainMode = 'auto' | 'cloud_preferred' | 'local_preferred' | 'local_only' | 'deterministic_only';

export interface BrainProviderStatus {
  cloudGeminiOnline: boolean;
  localOllamaOnline: boolean;
  activeMode: BrainMode;
  lastRoutingDecision: 'cloud_gemini' | 'local_ollama' | 'deterministic_engine';
  totalCloudCalls: number;
  totalLocalCalls: number;
  totalFallbackEvents: number;
}

export class HybridModelRouter {
  private mode: BrainMode = 'auto';
  private localEndpoint: string = 'http://localhost:11434';
  private localModel: string = 'qwen2.5:14b';
  private stats: BrainProviderStatus = {
    cloudGeminiOnline: true,
    localOllamaOnline: false,
    activeMode: 'auto',
    lastRoutingDecision: 'cloud_gemini',
    totalCloudCalls: 0,
    totalLocalCalls: 0,
    totalFallbackEvents: 0,
  };

  constructor() {
    this.checkLocalOllamaHealth().catch(() => {});
  }

  public setMode(newMode: BrainMode): void {
    this.mode = newMode;
    this.stats.activeMode = newMode;
    console.log(`[HybridModelRouter] Switched brain mode to: ${newMode}`);
  }

  public getStatus(): BrainProviderStatus {
    return { ...this.stats };
  }

  /**
   * Kiểm tra xem máy chủ Ollama / Local Open-Weights có đang hoạt động trên máy không
   */
  public async checkLocalOllamaHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${this.localEndpoint}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      this.stats.localOllamaOnline = res.ok;
      return res.ok;
    } catch {
      this.stats.localOllamaOnline = false;
      return false;
    }
  }

  /**
   * Bộ định tuyến thông minh: Quyết định gọi Cloud Gemini, Local Ollama, hay Deterministic Engine
   */
  public async routeMessage(
    userText: string,
    context: AgentContext,
    cloudCaller: (text: string, ctx: AgentContext) => Promise<AgentMessage>,
    deterministicCaller: (text: string, ctx: AgentContext) => Promise<AgentMessage>
  ): Promise<AgentMessage> {
    // 1. Chế độ Local Only hoặc Deterministic Only
    if (this.mode === 'deterministic_only') {
      this.stats.lastRoutingDecision = 'deterministic_engine';
      return deterministicCaller(userText, context);
    }

    if (this.mode === 'local_only') {
      return this.executeLocalOrDeterministic(userText, context, deterministicCaller);
    }

    // 2. Chế độ Auto hoặc Cloud Preferred: Thử gọi Cloud Gemini trước
    const circuitBroken = isCircuitOpen();
    if (!circuitBroken) {
      try {
        this.stats.totalCloudCalls++;
        this.stats.lastRoutingDecision = 'cloud_gemini';
        const response = await cloudCaller(userText, context);
        recordExecutionSuccess();
        this.stats.cloudGeminiOnline = true;
        return response;
      } catch (err: any) {
        console.warn(`[HybridModelRouter] Cloud Gemini call failed or overloaded (${err?.message}). Initiating instant Auto-Fallback...`);
        recordExecutionFailure(err?.message || 'Cloud Gemini call failed');
        this.stats.cloudGeminiOnline = false;
        this.stats.totalFallbackEvents++;
      }
    } else {
      console.warn(`[HybridModelRouter] Circuit Breaker OPEN for Cloud Gemini. Directing to Local Private Brain...`);
      this.stats.totalFallbackEvents++;
    }

    // 3. Auto-Fallback: Chuyển mạch sang Local AI (Ollama) hoặc Deterministic Engine
    return this.executeLocalOrDeterministic(userText, context, deterministicCaller);
  }

  private async executeLocalOrDeterministic(
    userText: string,
    context: AgentContext,
    deterministicCaller: (text: string, ctx: AgentContext) => Promise<AgentMessage>
  ): Promise<AgentMessage> {
    const hasLocal = await this.checkLocalOllamaHealth();

    if (hasLocal) {
      try {
        this.stats.totalLocalCalls++;
        this.stats.lastRoutingDecision = 'local_ollama';
        const localResponse = await this.callLocalOllama(userText, context);
        return localResponse;
      } catch (err) {
        console.warn('[HybridModelRouter] Local Ollama call failed, falling back to Deterministic Engine V2:', err);
      }
    }

    // Tầng phòng thủ cuối cùng: Deterministic Engine V2 (Zero-failure)
    this.stats.lastRoutingDecision = 'deterministic_engine';
    return deterministicCaller(userText, context);
  }

  /**
   * Gọi mô hình Local Open-Weights qua Ollama API
   */
  private async callLocalOllama(userText: string, context: AgentContext): Promise<AgentMessage> {
    const prompt = `Bạn là BOWCON, trợ lý cá nhân và AI Co-Founder đồng hành trung thành của Ngài. Hãy xưng là "Tôi" và gọi người dùng là "Ngài". Trả lời súc tích, chuyên nghiệp và lịch thiệp:\n\nNgài: ${userText}\nBOWCON:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${this.localEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.localModel,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Ollama returned status ${res.status}`);
    }

    const data: any = await res.json();
    return {
      id: 'local_msg_' + Date.now(),
      sender: 'agent',
      content: data.response || 'Báo cáo Sếp, tôi đã nhận được thông điệp từ Sếp qua Bộ Não Cục Bộ (Local Brain)!',
      timestamp: new Date().toISOString(),
      data: {
        source: 'local_ollama',
        model: this.localModel,
      },
      suggestions: ['📰 Đọc bản tin sáng', '⏳ Đơn nào đang chờ bàn giao?', '📈 Báo cáo doanh thu hôm nay'],
    };
  }
}

// Global Singleton Instance
export const globalHybridRouter = new HybridModelRouter();
