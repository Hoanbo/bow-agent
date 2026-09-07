// src/core/connection/connectionAuthorization.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - AUTHENTICATED != AUTHORIZED
// - AUTHORIZED != EXECUTED
// - CAPABILITY != AUTHORITY
// - SCREEN_CAPTURE_REQUEST != SCREEN_CAPTURE_EXECUTION
// - REMOTE_COMMAND != TOOL_EXECUTION
// - Zero cognitive/execution capabilities granted on remote connection surfaces.
import { ALLOWED_DATA_CAPABILITIES, FORBIDDEN_EXECUTION_CAPABILITIES, } from './connectionTypes.js';
import { deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
/**
 * Checks whether a capability string is one of the allowed safe data capabilities
 */
export function isAllowedCapability(cap) {
    return ALLOWED_DATA_CAPABILITIES.includes(cap);
}
/**
 * Checks whether a capability string is one of the strictly forbidden cognitive/execution capabilities
 */
export function isForbiddenCapability(cap) {
    return FORBIDDEN_EXECUTION_CAPABILITIES.includes(cap);
}
/**
 * Asserts that none of the capabilities are forbidden, failing closed immediately on detection
 */
export function assertSafeCapabilities(capabilities) {
    for (const cap of capabilities) {
        if (isForbiddenCapability(cap)) {
            throw new Error(`[CONNECTION_FORBIDDEN_CAPABILITY] Forbidden cognitive/execution capability requested: ${cap}`);
        }
    }
}
/**
 * Authorizes requested capabilities against allowed data capabilities and granted policy capabilities
 */
export function authorizeConnectionCapabilities(identity, requested, policyGranted = ALLOWED_DATA_CAPABILITIES) {
    const granted = [];
    const rejected = [];
    for (const cap of requested) {
        if (isForbiddenCapability(cap)) {
            // Immediate fail-closed on attempt to escalate to execution/governance
            return deepFreeze({
                authorized: false,
                grantedCapabilities: Object.freeze([]),
                rejectedCapabilities: Object.freeze([...requested]),
                error: `FORBIDDEN_CAPABILITY_ESCALATION_ATTEMPT: ${cap}`,
                fingerprint: computeConnectionFingerprint({ error: 'FORBIDDEN_CAPABILITY', cap }),
            });
        }
        if (isAllowedCapability(cap) && policyGranted.includes(cap)) {
            granted.push(cap);
        }
        else {
            rejected.push(cap);
        }
    }
    const fp = computeConnectionFingerprint({
        identity,
        granted,
        rejected,
    });
    return deepFreeze({
        authorized: true,
        grantedCapabilities: Object.freeze(granted),
        rejectedCapabilities: Object.freeze(rejected),
        fingerprint: fp,
    });
}
