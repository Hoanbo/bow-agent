import { ShopOfBowCommerceProvider, getActiveShopAdapter, setActiveShopAdapter, fallbackShopAdapter, type ShopAdapter } from './shopAdapter.js';
import { extractShopDuration, matchPlanByDuration, extractDeferredBuyContext } from './shopIntentResolver.js';
import './shopTools.js';
export declare const shopOfBowProvider: ShopOfBowCommerceProvider;
export declare const SHOPOFBOW_CAPABILITY_TERMS: string[];
/**
 * Authoritative bootstrap function for ShopOfBow adapter.
 * Connects retail provider, domain intent extensions, capability terms, and icon resolvers to Core.
 */
export declare function bootstrapShopOfBowAdapter(): void;
export { ShopOfBowCommerceProvider, getActiveShopAdapter, setActiveShopAdapter, fallbackShopAdapter, type ShopAdapter, extractShopDuration, matchPlanByDuration, extractDeferredBuyContext, };
