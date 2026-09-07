import type { PairingErrorCode } from './pairingTypes.js';
export declare class PairingError extends Error {
    readonly code: PairingErrorCode;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(code: PairingErrorCode, message: string, details?: Record<string, unknown>);
}
/**
 * Type guard for PairingError instances.
 */
export declare function isPairingError(err: unknown): err is PairingError;
/**
 * Factory for creating typed PairingError.
 */
export declare function createPairingError(code: PairingErrorCode, message: string, details?: Record<string, unknown>): PairingError;
