// src/core/connection/connectionMessage.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Canonical immutable connection messages.
// Deep frozen, deterministically fingerprinted, strictly scoped.
import { CONNECTION_PROTOCOL_VERSION } from './connectionTypes.js';
import { createConnectionScope, deepFreeze, scrubConnectionSecrets } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
import { assertValidChannelMapping } from './connectionChannel.js';
export const RISK_LEVEL_PRECEDENCE = Object.freeze({
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
});
export const MAX_CONNECTION_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_CORRELATION_DEPTH = 10;
/**
 * Asserts that childRisk does not downgrade parentRisk.
 * Risk level may stay equal or increase; MUST NEVER decrease.
 */
export function assertConnectionRiskNotDowngraded(parentRisk, childRisk) {
    const p = RISK_LEVEL_PRECEDENCE[parentRisk] ?? 1;
    const c = RISK_LEVEL_PRECEDENCE[childRisk] ?? 1;
    if (c < p) {
        throw new Error(`[CONNECTION_RISK_DOWNGRADE_DENIED] Cannot downgrade risk from ${parentRisk} to ${childRisk}`);
    }
}
export const assertRiskNotDowngraded = assertConnectionRiskNotDowngraded;
/**
 * Creates canonical, immutable, deepFrozen ConnectionMessage
 */
export function createConnectionMessage(params) {
    if (params.sequence < 1) {
        throw new Error(`[CONNECTION_SEQUENCE_ERROR] Message sequence must be positive (>= 1), got ${params.sequence}`);
    }
    assertValidChannelMapping(params.channel, params.messageType);
    const scope = createConnectionScope(params.scopeIdentity);
    const sanitizedPayload = scrubConnectionSecrets(params.payload);
    // Check payload size
    const payloadStr = JSON.stringify(sanitizedPayload);
    if (payloadStr.length > MAX_CONNECTION_PAYLOAD_BYTES) {
        throw new Error(`[CONNECTION_PAYLOAD_TOO_LARGE] Payload size ${payloadStr.length} exceeds limit ${MAX_CONNECTION_PAYLOAD_BYTES}`);
    }
    const riskLevel = params.riskLevel ?? 'LOW';
    const riskMetadata = {
        level: riskLevel,
        reason: params.riskReason,
    };
    const messageFingerprint = computeConnectionFingerprint({
        scope,
        channel: params.channel,
        direction: params.direction,
        sequence: params.sequence,
        messageType: params.messageType,
        correlationId: params.correlationId || null,
        causationId: params.causationId || null,
        payload: sanitizedPayload,
        riskLevel,
        protocolVersion: CONNECTION_PROTOCOL_VERSION,
    });
    const messageId = `cmsg_${messageFingerprint}`;
    return deepFreeze({
        messageId,
        scope,
        scopeIdentity: deepFreeze({ ...params.scopeIdentity }),
        channel: params.channel,
        direction: params.direction,
        sequence: params.sequence,
        messageType: params.messageType,
        correlationId: params.correlationId,
        causationId: params.causationId,
        payload: deepFreeze(sanitizedPayload),
        riskMetadata: deepFreeze(riskMetadata),
        protocolVersion: CONNECTION_PROTOCOL_VERSION,
        fingerprint: messageFingerprint,
    });
}
