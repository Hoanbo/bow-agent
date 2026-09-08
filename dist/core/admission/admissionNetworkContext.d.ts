import type { NetworkMetadata, NetworkType, NetworkLocality } from './admissionTypes.js';
export interface CreateNetworkMetadataOptions {
    readonly networkType: NetworkType;
    readonly ipAddress: string;
    readonly ssid?: string;
    readonly locality?: NetworkLocality;
    readonly isRoaming?: boolean;
    readonly transportType?: string;
    readonly interfaceName?: string;
}
/**
 * Creates an observational NetworkMetadata envelope.
 * Strictly frozen to prevent downstream mutation.
 */
export declare function createNetworkMetadata(options: CreateNetworkMetadataOptions): NetworkMetadata;
/**
 * Fundamental Zero-Trust predicate:
 * No IP address or network locality automatically grants trust.
 * Always returns false to guarantee that trust must be proven cryptographically.
 */
export declare function isNetworkLocationTrusted(_metadata: NetworkMetadata): boolean;
/**
 * Detects if a device has transitioned between different networks (Roaming).
 * e.g. Home Wi-Fi -> 4G -> 5G -> Other Wi-Fi -> Hotspot.
 */
export declare function detectNetworkRoaming(current: NetworkMetadata, previous?: NetworkMetadata): boolean;
/**
 * Proves that two network contexts describe the same device regardless of transport change.
 * Invariant:
 * same device + different IP/SSID = same persistent device identity
 */
export declare function isSameDeviceAcrossNetworks(deviceIdA: string, networkA: NetworkMetadata, deviceIdB: string, networkB: NetworkMetadata): boolean;
/**
 * Invariant test helper:
 * different device + same IP != same trusted device
 */
export declare function isDifferentDeviceSameNetworkRejected(deviceIdA: string, deviceIdB: string, sharedNetwork: NetworkMetadata): boolean;
export declare function isNetworkRoaming(from: NetworkMetadata, to: NetworkMetadata): boolean;
export declare function isLocalNetwork(meta: NetworkMetadata): boolean;
export declare function isRemoteNetwork(meta: NetworkMetadata): boolean;
