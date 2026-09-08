import type { RelayTimeoutCategory } from './relayTypes.js';
export declare class RelayTimeoutError extends Error {
    readonly category: RelayTimeoutCategory;
    readonly timeoutMs: number;
    readonly operationName: string;
    constructor(category: RelayTimeoutCategory, timeoutMs: number, operationName: string);
}
export declare const RELAY_TIMEOUT_DEFAULTS: Readonly<Record<RelayTimeoutCategory, number>>;
export declare function getRelayDefaultTimeout(category: RelayTimeoutCategory): number;
/**
 * Wraps a promise with a fail-closed typed timeout.
 */
export declare function withRelayTimeout<T>(promise: Promise<T>, timeoutMs: number, category: RelayTimeoutCategory, operationName: string): Promise<T>;
