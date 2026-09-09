import { type FederatedDeviceIdentity, type DeviceTrustState } from './delegationTypes.js';
export declare class FederatedDeviceError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, details?: Record<string, unknown> | undefined);
}
export interface RegisterDeviceInput {
    deviceId: string;
    ownerId?: string;
    platform?: string;
    hostMode?: string;
    capabilitiesSummary?: readonly string[];
}
export declare class FederatedDeviceRegistry {
    private devices;
    /**
     * Registers a device in the federation registry.
     */
    registerDevice(input: RegisterDeviceInput): FederatedDeviceIdentity;
    /**
     * Updates trust state of a federated device.
     * INVARIANT: Promoting to TRUSTED requires Master Owner authority.
     */
    setTrustState(deviceId: string, newState: DeviceTrustState, actorId: string): FederatedDeviceIdentity;
    getDevice(deviceId: string): FederatedDeviceIdentity | undefined;
    hasDevice(deviceId: string): boolean;
    isDeviceTrusted(deviceId: string): boolean;
    clear(): void;
}
export declare const globalFederatedDeviceRegistry: FederatedDeviceRegistry;
