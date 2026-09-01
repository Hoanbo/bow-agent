// src/core/router.ts
// BOW AGENT V3.3 — INTENT ROUTER & CHANNEL CLASSIFIER

import { resolveMultiIntent, isAmbiguousDemandQuery, detectPluralDiscoveryIntent } from './intentResolver.js';
import type { AgentIntent, AgentContext } from './types.js';
import type { ChannelType } from './security.js';

export interface RouteTarget {
  channel: ChannelType;
  primaryIntent: AgentIntent;
  secondaryIntents: AgentIntent[];
  isAmbiguous: boolean;
  isPluralDiscovery: boolean;
  routeDomain: 'SHOP' | 'ROBOT' | 'DESKTOP' | 'KNOWLEDGE' | 'GENERAL';
}

export function classifyChannel(context: AgentContext, defaultChannel: ChannelType = 'WEB'): ChannelType {
  if (context.channel) {
    const norm = String(context.channel).toUpperCase();
    if (norm === 'ROBOT') return 'ROBOT';
    if (norm === 'DESKTOP') return 'DESKTOP';
    if (norm === 'SYSTEM') return 'SYSTEM';
    return 'WEB';
  }
  return defaultChannel;
}

export function routeMessage(userText: string, context: AgentContext): RouteTarget {
  const channel = classifyChannel(context);
  const multi = resolveMultiIntent(userText);
  const isAmbiguous = isAmbiguousDemandQuery(userText);
  const isPluralDiscovery = detectPluralDiscoveryIntent(userText);

  let routeDomain: 'SHOP' | 'ROBOT' | 'DESKTOP' | 'KNOWLEDGE' | 'GENERAL' = 'SHOP';

  if (channel === 'ROBOT') {
    routeDomain = 'ROBOT';
  } else if (channel === 'DESKTOP' || /(?:mở\s+app|bật\s+chrome|chụp\s+màn\s+hình|nhấn\s+phím|click\s+chuột|open\s+browser)/i.test(userText)) {
    routeDomain = 'DESKTOP';
  } else if (['FAQ', 'WARRANTY_POLICY', 'SUPPORT_POLICY', 'NEGATIVE_POLICY'].includes(multi.primaryIntent)) {
    routeDomain = 'KNOWLEDGE';
  } else if (['BUY', 'CATALOG', 'VIEW_CATEGORY', 'CHECK_ORDER', 'WALLET_BALANCE', 'DEPOSIT', 'COUPON', 'RENEW'].includes(multi.primaryIntent)) {
    routeDomain = 'SHOP';
  } else {
    routeDomain = 'GENERAL';
  }

  return {
    channel,
    primaryIntent: multi.primaryIntent,
    secondaryIntents: multi.secondaryIntents,
    isAmbiguous,
    isPluralDiscovery,
    routeDomain,
  };
}
