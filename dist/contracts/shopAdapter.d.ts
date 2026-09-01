import type { CatalogProvider } from './catalogProvider.js';
import type { OrderProvider } from './orderProvider.js';
import type { WalletProvider } from './walletProvider.js';
import type { KnowledgeProvider } from './knowledgeProvider.js';
import type { AnalyticsProvider } from './analyticsProvider.js';
import type { ActionHandler } from './actionHandler.js';
import type { StorageAdapter } from './storageAdapter.js';
/**
 * ShopAdapter Interface
 * Represents the complete integration surface of Shop of BOW.
 * The Agent Core interacts exclusively through this composite boundary or its sub-providers,
 * completely unaware of Supabase, Vite, React, or browser window events.
 */
export interface ShopAdapter {
    readonly catalog: CatalogProvider;
    readonly orders: OrderProvider;
    readonly wallet: WalletProvider;
    readonly knowledge: KnowledgeProvider;
    readonly analytics: AnalyticsProvider;
    readonly actions: ActionHandler;
    readonly storage?: StorageAdapter;
}
export declare const fallbackShopAdapter: ShopAdapter;
export declare function setActiveShopAdapter(adapter: ShopAdapter): void;
export declare function getActiveShopAdapter(): ShopAdapter;
