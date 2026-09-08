import type { DeviceIdentityErrorCode } from './persistentDeviceTypes.js';
export interface PersistentDeviceErrorDetails {
    readonly deviceId?: string;
    readonly scopeString?: string;
    readonly details?: Record<string, unknown>;
    readonly cause?: unknown;
}
export declare class PersistentDeviceError extends Error {
    readonly errorCode: DeviceIdentityErrorCode;
    readonly deviceId?: string;
    readonly scopeString?: string;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly timestamp: number;
    constructor(errorCode: DeviceIdentityErrorCode, message: string, options?: PersistentDeviceErrorDetails);
}
/**
 * Creates a typed PersistentDeviceError with scrubbed details.
 */
export declare function createPersistentDeviceError(errorCode: DeviceIdentityErrorCode, message: string, options?: PersistentDeviceErrorDetails): PersistentDeviceError;
/**
 * Type guard for PersistentDeviceError.
 */
export declare function isPersistentDeviceError(value: unknown): value is PersistentDeviceError;
