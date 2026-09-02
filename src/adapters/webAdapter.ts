// src/adapters/webAdapter.ts
// BOW AGENT V3.3 — WEB CHANNEL ADAPTER (shopofbow Zero-Breaking Gateway)

import type { AgentContext, AgentMessage, AgentAction } from '../core/types.js';
import { processAgentMessage } from '../core/engine.js';
import { getSessionContext } from '../core/sessionContext.js';

export interface WebAgentRequestPayload {
  query?: string;
  text?: string;
  sessionId?: string;
  context?: Partial<AgentContext>;
}

export interface WebAgentResponsePayload {
  id: string;
  query: string;
  sessionId: string;
  intent: string;
  text: string;
  content: string;
  success: boolean;
  actionCard?: AgentAction | null;
  action?: AgentAction;
  actions?: AgentAction[];
  suggestions: string[];
  knowledgeGap?: boolean;
  telemetryEvents?: any[];
  data?: any;
  adminData?: any;
  timestamp: string;
}


export class WebAdapter {
  /**
   * Process web query and format 100% strictly compatible response for shopofbow
   */
  public async handleRequest(payload: WebAgentRequestPayload): Promise<WebAgentResponsePayload> {
    const rawQuery = String(payload.query || payload.text || '').trim();
    const sessionId = payload.sessionId || getSessionContext().updatedAt.toString();

    const agentCtx: AgentContext = {
      sessionId,
      userId: payload.context?.userId || 'guest_user',
      role: payload.context?.role || 'customer',
      isAuthenticated: Boolean(payload.context?.isAuthenticated),
      channel: 'WEB' as any,
      ...payload.context,
    };

    const message: AgentMessage = await processAgentMessage(rawQuery, agentCtx);

    const intent = message.data?.type || 'GENERAL';
    const actionCard = message.action || (message.actions && message.actions.length > 0 ? message.actions[0] : null);
    const knowledgeGap = message.data?.type === 'knowledge_gap' || false;
    const adminData = (agentCtx.role === 'admin' || agentCtx.role === 'owner') ? message.data : undefined;

    return {
      id: message.id,
      query: rawQuery,
      sessionId,
      intent,
      text: message.content,
      content: message.content,
      success: true,
      actionCard,
      action: message.action,
      actions: message.actions,
      suggestions: message.suggestions || [],
      knowledgeGap,
      data: message.data,
      adminData,
      timestamp: message.timestamp,
    };

  }
}

export const webAdapter = new WebAdapter();
