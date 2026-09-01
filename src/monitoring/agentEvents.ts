// src/services/agent/monitoring/agentEvents.ts
// Decoupled Analytics Event Ingestion via StorageAdapter / AnalyticsProvider

import type { AgentAnalyticsEvent } from './analyticsTypes.js';
import type { AnalyticsProvider } from '../contracts/index.js';
import { getActiveShopAdapter } from '../contracts/index.js';

export async function insertAnalyticsEvent(
  event: AgentAnalyticsEvent,
  analyticsProvider?: AnalyticsProvider
) {
  try {
    if (analyticsProvider) {
      await analyticsProvider.recordEvent({
        sessionId: event.sessionId || 'session-unknown',
        eventType: event.eventType,
        userId: event.userId || undefined,
        intent: (event.intent as any) || undefined,
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
    if (adapter.analytics && typeof (adapter.analytics as any).recordEvent === 'function') {
      await (adapter.analytics as any).recordEvent({
        sessionId: event.sessionId || 'session-unknown',
        eventType: event.eventType,
        userId: event.userId || undefined,
        intent: (event.intent as any) || undefined,
        reason: event.reason || undefined,
        metadata: event.metadata,
      });
      return;
    }

    if (adapter.analytics && typeof (adapter.analytics as any).track === 'function') {
      (adapter.analytics as any).track(event);
      return;
    }

    await adapter.storage?.recordAgentEvent({
      sessionId: event.sessionId || 'session-unknown',
      eventType: event.eventType,
      userId: event.userId || undefined,
      intent: (event.intent as any) || undefined,
      reason: event.reason || undefined,
      metadata: event.metadata,
      actionId: event.actionId,
      actionType: event.actionType,
      productId: event.productId,
      planId: event.planId,
    } as any);
  } catch (err) {
    console.warn('[Monitoring] Exception during analytics insert:', err);
  }
}
