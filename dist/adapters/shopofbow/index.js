// src/adapters/shopofbow/index.ts
// BOWCON V4.0 — SHOPOFBOW DOMAIN ADAPTER BOOTSTRAP ROOT
//
// EN:
// Authoritative entrypoint and bootstrap layer for the ShopOfBow retail domain.
// This is the ONLY place in the entire system that registers the 'shopofbow' provider,
// domain intent extensions, capability terms, and retail icon resolvers.
//
// VI:
// Điểm khởi đầu và tầng bootstrap có thẩm quyền cho miền bán lẻ ShopOfBow.
// Đây là nơi DUY NHẤT trong toàn bộ hệ thống đăng ký provider 'shopofbow',
// các bộ mở rộng ý định domain, từ khóa năng lực, và bộ giải quyết icon bán lẻ.
import { registerCommerceProvider } from '../../core/commerceRegistry.js';
import { registerDomainIntentExtension } from '../../core/intentResolver.js';
import { registerProductCapabilityTerms } from '../../core/productResolver.js';
import { setProductIconResolver } from '../../core/responseFormatter.js';
import { ShopOfBowCommerceProvider, getActiveShopAdapter, setActiveShopAdapter, fallbackShopAdapter, } from './shopAdapter.js';
import { extractShopDuration, matchPlanByDuration, extractDeferredBuyContext, } from './shopIntentResolver.js';
import './shopTools.js';
// 1. Instantiate the authoritative CommerceProvider
export const shopOfBowProvider = new ShopOfBowCommerceProvider();
// 2. Retail product capability terms
export const SHOPOFBOW_CAPABILITY_TERMS = [
    'xem phim', 'xem phim online', 'phim', 'phim bo', 'phim truc tuyen', 'phim trung quoc', 'phim hoa ngu',
    'nghe nhac', 'nhac', 'am nhac', 'podcast', 'giai tri', 'chinh anh', 'edit video', 'lam video', 'hoc tieng anh', 'dich thuat', 'streaming',
    'xem video', 'video', 'giai tri video', 'streaming video', 'truyen hinh truc tuyen', 'xem tv online',
    'drama', 'drama trung quoc', 'kenh truyen hinh',
];
import { setActiveShopAdapter as setContractsActiveShopAdapter } from '../../contracts/shopAdapter.js';
/**
 * Authoritative bootstrap function for ShopOfBow adapter.
 * Connects retail provider, domain intent extensions, capability terms, and icon resolvers to Core.
 */
export function bootstrapShopOfBowAdapter() {
    registerCommerceProvider(shopOfBowProvider);
    setContractsActiveShopAdapter(fallbackShopAdapter);
    registerDomainIntentExtension({
        matchPlanByDuration,
        extractDeferredBuyContext,
        extractDomainDuration: extractShopDuration,
    });
    registerProductCapabilityTerms(SHOPOFBOW_CAPABILITY_TERMS);
    setProductIconResolver((name) => {
        const low = name.toLowerCase();
        if (low.includes('capcut'))
            return '🎬';
        if (low.includes('netflix') || low.includes('youtube'))
            return '🍿';
        if (low.includes('canva') || low.includes('figma'))
            return '🎨';
        if (low.includes('gpt') || low.includes('ai'))
            return '🤖';
        return null;
    });
}
// Initial bootstrap on import
bootstrapShopOfBowAdapter();
// Re-exports
export { ShopOfBowCommerceProvider, getActiveShopAdapter, setActiveShopAdapter, fallbackShopAdapter, extractShopDuration, matchPlanByDuration, extractDeferredBuyContext, };
