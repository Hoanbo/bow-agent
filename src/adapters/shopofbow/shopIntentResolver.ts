// src/adapters/shopofbow/shopIntentResolver.ts
// BOWCON V4.0 — SHOPOFBOW DOMAIN INTENT RESOLUTION & PLAN MATCHING ADAPTER
//
// EN:
// Domain-specific adapter layer for ShopOfBow e-commerce:
// Maps generic structured linguistic intents to retail plans, prices, and checkout targets.
//
// VI:
// Tầng adapter đặc thù domain cho thương mại điện tử ShopOfBow:
// Ánh xạ ý định ngôn ngữ tổng quát sang các gói cước bán lẻ, giá tiền và mục tiêu thanh toán.

import type { PlanItemResult, DeferredContext } from '../../core/types.js';
import { normalizeText, extractDuration as extractGenericDuration } from '../../core/intentResolver.js';

/**
 * Domain-specific duration extractor including token package sizes
 */
export function extractShopDuration(text: string): string | undefined {
  if (!text) return undefined;
  const norm = normalizeText(text);

  // ShopOfBow Token Packages (domain-specific)
  if (/\b(100m|100\s*trieu)\s*token\b/.test(norm)) return '100M Token';
  if (/\b(50m|50\s*trieu)\s*token\b/.test(norm)) return '50M Token';
  if (/\b(10m|10\s*trieu)\s*token\b/.test(norm)) return '10M Token';

  return extractGenericDuration(text);
}

/**
 * Matches retail plans by duration and aliases (YouTube, Canva, Netflix, etc.)
 */
export function matchPlanByDuration(
  plans: PlanItemResult[],
  durationOrText: string,
  fullQuery?: string
): PlanItemResult | undefined {
  if (!plans || plans.length === 0) return undefined;

  const duration = extractShopDuration(durationOrText) || extractShopDuration(fullQuery || '') || durationOrText;
  if (!duration) return undefined;

  const normDuration = normalizeText(duration);

  const equivalents: Record<string, string[]> = {
    '6 thang': ['6 thang', '180 ngay', 'nua nam'],
    '1 nam': ['1 nam', '12 thang', '365 ngay', 'ca nam'],
    '3 thang': ['3 thang', '90 ngay', '1 quy'],
    '1 thang': ['1 thang', '30 ngay'],
    '1 tuan': ['1 tuan', '7 ngay'],
    '3 nam': ['3 nam'],
    'vinh vien': ['vinh vien', 'tron doi', 'lifetime'],
  };

  const terms = equivalents[normDuration] || [normDuration];

  return plans.find((plan) => {
    const planText = normalizeText(`${plan.name} ${plan.duration || ''}`);
    return terms.some((term) => planText.includes(term));
  });
}

/**
 * Extracts deferred retail buy context from user queries
 */
export function extractDeferredBuyContext(text: string): DeferredContext {
  const duration = extractShopDuration(text);

  let productName: string | undefined = undefined;
  const buyMatch = text.match(/(?:mua|cho tôi mua|tôi cần mua|tôi muốn mua|có muốn mua|muốn mua|cần mua|đăng ký|lấy|chốt)\s+([^,.\n?]+?)(?:\s+(?:nhưng|rồi|trước|giúp|được không|thì|nếu|xem)|$)/i);
  if (buyMatch) {
    let candidate = buyMatch[1].trim();
    candidate = candidate
      .replace(/100m\s*token|50m\s*token|10m\s*token|100m|50m|10m/gi, '')
      .replace(/(?:6|12|3|1)\s*th[áa]ng|6th[áa]ng|12th[áa]ng|3th[áa]ng|1th[áa]ng|1\s*n[ăa]m|1n[ăa]m|3\s*n[ăa]m|3n[ăa]m|1\s*tu[ầa]n|1tu[ầa]n|n[ửu]a\s*n[ăa]m|c[ảa]\s*n[ăa]m|180\s*ng[àa]y|365\s*ng[àa]y|90\s*ng[àa]y|30\s*ng[àa]y|7\s*ng[àa]y/gi, '')
      .replace(/\bgói\b|\btài\s*khoản\b|\bapp\b/gi, '')
      .trim();

    if (candidate.length >= 2 && !['này', 'nọ', 'đó', 'kia', 'ở đây', '1', '6', '12', '3'].includes(candidate.toLowerCase())) {
      productName = candidate;
    }
  }

  return {
    intent: 'BUY',
    duration,
    productName,
    rawQuery: text,
  };
}
