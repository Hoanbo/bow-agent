import type { AdmissionRequest, NetworkMetadata } from './admissionTypes.js';
export declare const DEVICE_ID_REGEX: RegExp;
/**
 * Validates that a device identifier adheres to canonical persistent device identity format.
 */
export declare function isValidAdmissionDeviceId(id: unknown): id is string;
export declare const validateAdmissionDeviceIdentityFormat: typeof isValidAdmissionDeviceId;
/**
 * Asserts that a device identifier is valid and well-formed.
 * Fails closed if malformed, empty, or attempting path traversal / null injection.
 */
export declare function assertValidAdmissionDeviceId(id: unknown): void;
export declare const assertValidAdmissionDeviceIdentity: typeof assertValidAdmissionDeviceId;
export interface AdmissionDeviceIdentity {
    readonly deviceId: string;
}
/**
 * Resolves persistent device identity strictly from the authenticated admission request or options.
 * Guarantees that network location (IP, SSID, transport) is NOT used as identity.
 */
export declare function resolveAdmissionDeviceIdentity(input: {
    deviceId: string;
    networkMetadata?: NetworkMetadata;
    scope?: any;
    network?: any;
} | AdmissionRequest): AdmissionDeviceIdentity;
