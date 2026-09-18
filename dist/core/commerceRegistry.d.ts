import type { CommerceProvider, CommerceEntity, CommerceActionResult } from '../contracts/commerceProvider.js';
export type { CommerceProvider, CommerceEntity, CommerceActionResult };
/**
 * Deterministic NO-OP provider internal to Core.
 * Used when no external domain adapter is loaded/registered.
 */
export declare const NOOP_COMMERCE_PROVIDER: CommerceProvider;
/**
 * Register the active domain commerce provider.
 */
export declare function registerCommerceProvider(provider: CommerceProvider): void;
/**
 * Get the currently active commerce provider.
 * Returns the registered provider, or the Core NO-OP provider if none is registered.
 */
export declare function getActiveCommerceProvider(): CommerceProvider;
/**
 * Returns raw active provider reference (or null if none registered).
 */
export declare function getRawActiveCommerceProvider(): CommerceProvider | null;
/**
 * Reset registered commerce provider (used in test tear-down).
 */
export declare function resetCommerceProvider(): void;
