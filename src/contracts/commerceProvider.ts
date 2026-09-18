// src/contracts/commerceProvider.ts
// BOWCON V4.0 — GENERIC COMMERCE & BUSINESS DOMAIN PROVIDER CONTRACT
//
// EN:
// Minimal generic interface that ANY business domain (e-commerce, CRM, SaaS billing,
// inventory, booking, etc.) can implement. The Agent Core interacts strictly through
// this abstract provider boundary, completely independent of retail products, pricing,
// or specific vendor databases.
//
// VI:
// Giao diện tổng quát tối thiểu mà BẤT KỲ domain nghiệp vụ nào (thương mại điện tử,
// CRM, thanh toán SaaS, kho hàng, đặt lịch, v.v.) đều có thể triển khai. Lõi Agent
// tương tác độc quyền qua ranh giới trừu tượng này, hoàn toàn không phụ thuộc vào
// sản phẩm bán lẻ, bảng giá, hay cơ sở dữ liệu của nhà cung cấp cụ thể.

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
  queryCatalog?(query: { query?: string; category?: string; limit?: number }): Promise<CommerceEntity[]>;

  /** Look up an entity by type and identifier */
  lookupEntity?(entityType: string, entityId: string): Promise<Record<string, any> | null>;

  /** Execute a business action (e.g. checkout, refund, query balance) */
  executeCommerceAction?(action: { type: string; payload: Record<string, any> }): Promise<CommerceActionResult>;

  /** Retrieve business telemetry/metrics if supported */
  getMetrics?(metricType: string): Promise<Record<string, any>>;

  /** Check domain provider operational health */
  getHealth?(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: Record<string, any> }>;
}

export {
  registerCommerceProvider,
  getActiveCommerceProvider,
  resetCommerceProvider,
  NOOP_COMMERCE_PROVIDER,
} from '../core/commerceRegistry.js';

