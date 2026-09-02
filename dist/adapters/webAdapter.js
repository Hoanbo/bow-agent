// src/adapters/webAdapter.ts
// BOW AGENT V3.3 — WEB CHANNEL ADAPTER (shopofbow Zero-Breaking Gateway)
import { processAgentMessage } from '../core/engine.js';
import { getSessionContext } from '../core/sessionContext.js';
export class WebAdapter {
    /**
     * Process web query and format 100% strictly compatible response for shopofbow
     */
    async handleRequest(payload) {
        const rawQuery = String(payload.query || payload.text || '').trim();
        const sessionId = payload.sessionId || getSessionContext().updatedAt.toString();
        const agentCtx = {
            sessionId,
            userId: payload.context?.userId || 'guest_user',
            role: payload.context?.role || 'customer',
            isAuthenticated: Boolean(payload.context?.isAuthenticated),
            channel: 'WEB',
            ...payload.context,
        };
        const message = await processAgentMessage(rawQuery, agentCtx);
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
