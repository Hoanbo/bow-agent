import { type SafeDeviceCapability } from './pairingTypes.js';
/**
 * Checks if any of the provided capabilities match forbidden cognitive/execution escalation.
 */
export declare function hasForbiddenCapability(capabilities: readonly string[]): boolean;
/**
 * Validates a capability list.
 * Fails closed with [PAIRING_CAPABILITY_REJECTED] if any forbidden or unknown capability is requested.
 */
export declare function validatePairingCapabilities(capabilities: readonly string[]): readonly SafeDeviceCapability[];
/**
 * Filters only safe device capabilities from an arbitrary list, silently dropping unpermitted ones.
 */
export declare function filterSafeCapabilities(capabilities: readonly string[]): readonly SafeDeviceCapability[];
/**
 * Computes canonical order-independent capability fingerprint.
 * [ 'RECEIVE_EVENTS', 'REQUEST_SCREEN_CAPTURE' ] and
 * [ 'REQUEST_SCREEN_CAPTURE', 'RECEIVE_EVENTS' ] produce identical digests.
 */
export declare function computeCanonicalCapabilityFingerprint(capabilities: readonly SafeDeviceCapability[]): string;
