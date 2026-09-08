import type { DeviceVaultErrorCode } from './deviceVaultTypes.js';
export declare class DeviceVaultError extends Error {
    readonly errorCode: DeviceVaultErrorCode;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly timestamp: number;
    constructor(errorCode: DeviceVaultErrorCode, message: string, details?: Record<string, unknown>);
}
/**
 * Factory helper for creating a DeviceVaultError.
 */
export declare function createDeviceVaultError(errorCode: DeviceVaultErrorCode, message: string, details?: Record<string, unknown>): DeviceVaultError;
/**
 * Type guard for DeviceVaultError.
 */
export declare function isDeviceVaultError(err: unknown): err is DeviceVaultError;
