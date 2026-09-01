// src/services/agent/monitoring/agentEvents.ts
// Decoupled Analytics Event Ingestion via StorageAdapter / AnalyticsProvider
import { getActiveShopAdapter } from '../contracts/index.js';
export async function insertAnalyticsEvent(event, analyticsProvider) {
    try {
        if (analyticsProvider) {
            await analyticsProvider.recordEvent({
                sessionId: event.sessionId || 'session-unknown',
                eventType: event.eventType,
                userId: event.userId || undefined,
                intent: event.intent || undefined,
                reason: event.reason || undefined,
                metadata: {
                    ...(event.metadata || {}),
                    productId: event.productId,
                    planId: event.planId,
                    actionId: event.actionId,
                    actionType: event.actionType,
                },
            });
            return;
        }
        const adapter = getActiveShopAdapter();
        if (adapter.analytics && typeof adapter.analytics.recordEvent === 'function') {
            await adapter.analytics.recordEvent({
                sessionId: event.sessionId || 'session-unknown',
                eventType: event.eventType,
                userId: event.userId || undefined,
                intent: event.intent || undefined,
                reason: event.reason || undefined,
                metadata: event.metadata,
            });
            return;
        }
        if (adapter.analytics && typeof adapter.analytics.track === 'function') {
            adapter.analytics.track(event);
            return;
        }
        await adapter.storage?.recordAgentEvent({
            sessionId: event.sessionId || 'session-unknown',
            eventType: event.eventType,
            userId: event.userId || undefined,
            intent: event.intent || undefined,
            reason: event.reason || undefined,
            metadata: event.metadata,
            actionId: event.actionId,
            actionType: event.actionType,
            productId: event.productId,
            planId: event.planId,
        });
    }
    catch (err) {
        console.warn('[Monitoring] Exception during analytics insert:', err);
    }
}
