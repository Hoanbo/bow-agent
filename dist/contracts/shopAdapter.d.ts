import type { CatalogProvider } from './catalogProvider.js';
import type { OrderProvider } from './orderProvider.js';
import type { WalletProvider } from './walletProvider.js';
import type { AdminProvider } from './adminProvider.js';
import type { KnowledgeProvider } from './knowledgeProvider.js';
import type { AnalyticsProvider } from './analyticsProvider.js';
import type { ActionHandler } from './actionHandler.js';
import type { StorageAdapter } from './storageAdapter.js';
export interface ShopAdapter {
    readonly catalog: CatalogProvider;
    readonly orders: OrderProvider;
    readonly wallet: WalletProvider;
    readonly knowledge: KnowledgeProvider;
    readonly analytics: AnalyticsProvider;
    readonly actions: ActionHandler;
    readonly storage?: StorageAdapter;
    readonly admin?: AdminProvider;
}
export declare const fallbackShopAdapter: ShopAdapter;
export declare function getActiveShopAdapter(): ShopAdapter;
export declare function setActiveShopAdapter(adapter: ShopAdapter): void;
