import type { CatalogProvider } from './contracts/catalogProvider.js';
import type { OrderProvider } from './contracts/orderProvider.js';
import type { WalletProvider } from './contracts/walletProvider.js';
import type { AdminProvider } from './contracts/adminProvider.js';
import type { KnowledgeProvider } from '../../contracts/knowledgeProvider.js';
import type { AnalyticsProvider } from '../../contracts/analyticsProvider.js';
import type { ActionHandler } from '../../contracts/actionHandler.js';
import type { StorageAdapter } from '../../contracts/storageAdapter.js';
import type { CommerceProvider, CommerceEntity, CommerceActionResult } from '../../contracts/commerceProvider.js';
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
    readonly admin?: AdminProvider;
}
export declare const DEFAULT_SHOPOFBOW_PRODUCTS: {
    id: string;
    name: string;
    slug: string;
    type: "premium-app";
    startingPrice: number;
    warranty: string;
    description: string;
    plans: {
        id: string;
        name: string;
        duration: string;
        price: number;
        isHighlight: boolean;
    }[];
}[];
export declare const fallbackShopAdapter: ShopAdapter;
export declare function setActiveShopAdapter(adapter: ShopAdapter): void;
export declare function getActiveShopAdapter(): ShopAdapter;
export declare class ShopOfBowCommerceProvider implements CommerceProvider {
    readonly id = "shopofbow";
    readonly domainName = "Shop of BOW Retail";
    private _adapter?;
    get adapter(): ShopAdapter;
    constructor(adapter?: ShopAdapter);
    queryCatalog(query: {
        query?: string;
        category?: string;
        limit?: number;
    }): Promise<CommerceEntity[]>;
    lookupEntity(entityType: string, entityId: string): Promise<Record<string, any> | null>;
    executeCommerceAction(action: {
        type: string;
        payload: Record<string, any>;
    }): Promise<CommerceActionResult>;
    getHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details?: Record<string, any>;
    }>;
}
