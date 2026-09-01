// src/core/engine.ts
// BOW AGENT V3.3 — MASTER ORCHESTRATOR & RUNTIME ENGINE

import { processAgentMessage as processCoreAgentMessage, processAgentMessageV2 } from './agentEngine.js';
import { routeMessage } from './router.js';
import { scanSecurity, verifyChannelAccess } from './security.js';
import { memoryStore } from './memory.js';
import type { AgentContext, AgentMessage } from './types.js';

export interface MultiChannelInput {
  userText: string;
  channel?: 'WEB' | 'ROBOT' | 'DESKTOP' | 'SYSTEM';
  sessionId?: string;
  userId?: string;
  authToken?: string;
  context?: Partial<AgentContext>;
}

export interface MultiChannelOutput {
  message: AgentMessage;
  channel: 'WEB' | 'ROBOT' | 'DESKTOP' | 'SYSTEM';
  sessionId: string;
  latencyMs: number;
  security: {
    isSafe: boolean;
    piiDetected: boolean;
  };
}

export class AgentEngine {
  /**
   * Primary entry point for processing agent queries across Web, Robot, and Desktop channels
   */
  public async handleMessage(input: MultiChannelInput): Promise<MultiChannelOutput> {
    const startTime = Date.now();
    const sessionId = input.sessionId || 'session_' + Date.now();
    const channel = input.channel || 'WEB';

    // 1. Security & PII Scan
    const secScan = scanSecurity(input.userText);
    if (!secScan.isSafe) {
      const blockedMessage: AgentMessage = {
        id: 'msg_sec_' + Date.now(),
        sender: 'agent',
        content: '⚠️ Yêu cầu của bạn bị từ chối do vi phạm chính sách an toàn thông tin.',
        timestamp: new Date().toISOString(),
        suggestions: ['🛍️ Xem danh mục', 'Gặp hỗ trợ viên'],
      };

      return {
        message: blockedMessage,
        channel,
        sessionId,
        latencyMs: Date.now() - startTime,
        security: { isSafe: false, piiDetected: secScan.containsPii },
      };
    }

    // 2. Build full AgentContext
    const fullContext: AgentContext = {
      userId: input.userId || 'guest_user',
      role: input.context?.role || 'customer',
      isAuthenticated: input.context?.isAuthenticated ?? false,
      channel: channel as any,
      sessionId,
      authToken: input.authToken,
      ...input.context,
    };

    // 3. Record User Turn in Memory
    memoryStore.addTurn(sessionId, {
      id: 'turn_u_' + Date.now(),
      sender: 'user',
      content: secScan.sanitizedText,
      timestamp: new Date().toISOString(),
    });

    // 4. Process with Core Engine (V3 Gemini -> V2 Deterministic Fallback)
    const message = await processCoreAgentMessage(secScan.sanitizedText, fullContext);

    // 5. Record Agent Turn in Memory
    memoryStore.addTurn(sessionId, {
      id: 'turn_a_' + Date.now(),
      sender: 'agent',
      content: message.content,
      timestamp: new Date().toISOString(),
    });

    const latencyMs = Date.now() - startTime;

    return {
      message,
      channel,
      sessionId,
      latencyMs,
      security: {
        isSafe: true,
        piiDetected: secScan.containsPii,
      },
    };
  }
}

export const agentEngine = new AgentEngine();
export { processCoreAgentMessage as processAgentMessage, processAgentMessageV2 };
