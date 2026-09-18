// src/core/commerceRegistry.ts
// BOWCON V4.0 — CENTRAL CORE COMMERCE & BUSINESS DOMAIN REGISTRY
//
// EN:
// Authoritative in-memory registry for the active business domain provider.
// Decouples Core from any specific domain implementation (e-commerce, CRM, SaaS billing).
// If no external adapter is registered, provides a safe, deterministic NO-OP provider.
//
// VI:
// Registry bộ nhớ có thẩm quyền cho provider miền nghiệp vụ đang hoạt động.
// Tách biệt hoàn toàn Core khỏi bất kỳ triển khai domain cụ thể nào.
// Nếu không có adapter nào được đăng ký, cung cấp một no-op provider an toàn, tất định.

import type {
  CommerceProvider,
  CommerceEntity,
  CommerceActionResult,
} from '../contracts/commerceProvider.js';

export type { CommerceProvider, CommerceEntity, CommerceActionResult };

/**
 * Deterministic NO-OP provider internal to Core.
 * Used when no external domain adapter is loaded/registered.
 */
export const NOOP_COMMERCE_PROVIDER: CommerceProvider = {
  id: 'core_noop',
  domainName: 'Core Standalone Fallback Provider',
  async queryCatalog() {
    return [];
  },
  async lookupEntity() {
    return null;
  },
  async executeCommerceAction(action) {
    return {
      actionId: `noop_${Date.now()}`,
      type: action.type,
      success: false,
      error: 'No active commerce domain provider registered in Core registry.',
    };
  },
  async getMetrics() {
    return {};
  },
  async getHealth() {
    return {
      status: 'healthy',
      details: { standalone: true, registeredProvider: false },
    };
  },
};

let activeProvider: CommerceProvider | null = null;

/**
 * Register the active domain commerce provider.
 */
export function registerCommerceProvider(provider: CommerceProvider): void {
  activeProvider = provider;
}

/**
 * Get the currently active commerce provider.
 * Returns the registered provider, or the Core NO-OP provider if none is registered.
 */
export function getActiveCommerceProvider(): CommerceProvider {
  return activeProvider || NOOP_COMMERCE_PROVIDER;
}

/**
 * Returns raw active provider reference (or null if none registered).
 */
export function getRawActiveCommerceProvider(): CommerceProvider | null {
  return activeProvider;
}

/**
 * Reset registered commerce provider (used in test tear-down).
 */
export function resetCommerceProvider(): void {
  activeProvider = null;
}
