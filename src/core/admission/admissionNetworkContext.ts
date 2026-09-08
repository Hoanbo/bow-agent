// src/core/admission/admissionNetworkContext.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Network metadata as observational transport context ONLY.
// STRICT INVARIANTS:
// - NETWORK_LOCATION != DEVICE_IDENTITY
// - IP_ADDRESS != DEVICE_IDENTITY
// - WI_FI_NETWORK != DEVICE_TRUST
// - PROTOCOL != DEVICE_TRUST
// - ZERO IP-BASED TRUST: No network is inherently trusted (LAN, 4G, 5G, public Wi-Fi).

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
export function createNetworkMetadata(options: CreateNetworkMetadataOptions): NetworkMetadata {
  const ipAddress = (options.ipAddress || '').trim();
  const networkType = options.networkType || 'UNKNOWN';
  const locality: NetworkLocality = options.locality || 'UNKNOWN';
  const transportType = options.transportType || 'GENERIC_TRANSPORT';

  return Object.freeze({
    networkType,
    ipAddress,
    ssid: options.ssid?.trim(),
    locality,
    isRoaming: Boolean(options.isRoaming),
    transportType,
    interfaceName: options.interfaceName?.trim(),
  });
}

/**
 * Fundamental Zero-Trust predicate:
 * No IP address or network locality automatically grants trust.
 * Always returns false to guarantee that trust must be proven cryptographically.
 */
export function isNetworkLocationTrusted(_metadata: NetworkMetadata): boolean {
  // STRICT INVARIANT: ZERO IP/NETWORK-BASED TRUST
  return false;
}

/**
 * Detects if a device has transitioned between different networks (Roaming).
 * e.g. Home Wi-Fi -> 4G -> 5G -> Other Wi-Fi -> Hotspot.
 */
export function detectNetworkRoaming(current: NetworkMetadata, previous?: NetworkMetadata): boolean {
  if (!previous) {
    return false;
  }
  return (
    current.networkType !== previous.networkType ||
    current.ipAddress !== previous.ipAddress ||
    current.ssid !== previous.ssid
  );
}

/**
 * Proves that two network contexts describe the same device regardless of transport change.
 * Invariant:
 * same device + different IP/SSID = same persistent device identity
 */
export function isSameDeviceAcrossNetworks(
  deviceIdA: string,
  networkA: NetworkMetadata,
  deviceIdB: string,
  networkB: NetworkMetadata
): boolean {
  if (deviceIdA !== deviceIdB) {
    return false; // Different device IDs are never the same device, even if IP or SSID is identical
  }
  // Same deviceId across different network parameters preserves persistent identity
  return true;
}

/**
 * Invariant test helper:
 * different device + same IP != same trusted device
 */
export function isDifferentDeviceSameNetworkRejected(
  deviceIdA: string,
  deviceIdB: string,
  sharedNetwork: NetworkMetadata
): boolean {
  // If IDs differ, sharing an IP or Wi-Fi NEVER equates device identities
  return deviceIdA !== deviceIdB;
}

export function isNetworkRoaming(from: NetworkMetadata, to: NetworkMetadata): boolean {
  return detectNetworkRoaming(to, from);
}

export function isLocalNetwork(meta: NetworkMetadata): boolean {
  return meta.locality === 'LOCAL';
}

export function isRemoteNetwork(meta: NetworkMetadata): boolean {
  return meta.locality === 'REMOTE';
}

