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
/**
 * Creates an observational NetworkMetadata envelope.
 * Strictly frozen to prevent downstream mutation.
 */
export function createNetworkMetadata(options) {
    const ipAddress = (options.ipAddress || '').trim();
    const networkType = options.networkType || 'UNKNOWN';
    const locality = options.locality || 'UNKNOWN';
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
export function isNetworkLocationTrusted(_metadata) {
    // STRICT INVARIANT: ZERO IP/NETWORK-BASED TRUST
    return false;
}
/**
 * Detects if a device has transitioned between different networks (Roaming).
 * e.g. Home Wi-Fi -> 4G -> 5G -> Other Wi-Fi -> Hotspot.
 */
export function detectNetworkRoaming(current, previous) {
    if (!previous) {
        return false;
    }
    return (current.networkType !== previous.networkType ||
        current.ipAddress !== previous.ipAddress ||
        current.ssid !== previous.ssid);
}
/**
 * Proves that two network contexts describe the same device regardless of transport change.
 * Invariant:
 * same device + different IP/SSID = same persistent device identity
 */
export function isSameDeviceAcrossNetworks(deviceIdA, networkA, deviceIdB, networkB) {
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
export function isDifferentDeviceSameNetworkRejected(deviceIdA, deviceIdB, sharedNetwork) {
    // If IDs differ, sharing an IP or Wi-Fi NEVER equates device identities
    return deviceIdA !== deviceIdB;
}
export function isNetworkRoaming(from, to) {
    return detectNetworkRoaming(to, from);
}
export function isLocalNetwork(meta) {
    return meta.locality === 'LOCAL';
}
export function isRemoteNetwork(meta) {
    return meta.locality === 'REMOTE';
}
