export interface CommerceEntity {
    id: string;
    name: string;
    category?: string;
    description?: string | null;
    metadata?: Record<string, any>;
}
export interface CommerceActionResult {
    actionId: string;
    type: string;
    success: boolean;
    result?: any;
    error?: string;
}
export interface CommerceProvider {
    /** Unique domain identifier (e.g. 'domain_retail', 'generic_catalog', 'saas_billing') */
    readonly id: string;
    /** Human-readable business domain name */
    readonly domainName: string;
    /** Query or search domain entities/items */
    queryCatalog?(query: {
        query?: string;
        category?: string;
        limit?: number;
    }): Promise<CommerceEntity[]>;
    /** Look up an entity by type and identifier */
    lookupEntity?(entityType: string, entityId: string): Promise<Record<string, any> | null>;
    /** Execute a business action (e.g. checkout, refund, query balance) */
    executeCommerceAction?(action: {
        type: string;
        payload: Record<string, any>;
    }): Promise<CommerceActionResult>;
    /** Retrieve business telemetry/metrics if supported */
    getMetrics?(metricType: string): Promise<Record<string, any>>;
    /** Check domain provider operational health */
    getHealth?(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details?: Record<string, any>;
    }>;
}
export { registerCommerceProvider, getActiveCommerceProvider, resetCommerceProvider, NOOP_COMMERCE_PROVIDER, } from '../core/commerceRegistry.js';
