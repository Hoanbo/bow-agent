// src/core/wire/wireEnvelope.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Canonical Wire Envelope Validation and Construction.
//
// STRICT RULE:
// The wire layer treats payloads as opaque data.
// It MUST NOT carry:
// - Private keys
// - Passwords
// - Raw credentials
// - Brain memory
// - LLM prompts
// - Hidden system instructions
// - Authorization secrets
// - Execution authority
// - Arbitrary executable code
import { WIRE_PROTOCOL_VERSION } from './wireTypes.js';
import { WireTransportError } from './wireFailure.js';
const FORBIDDEN_KEYS = new Set([
    'privateKey',
    'private_key',
    'privateKeyPem',
    'password',
    'rawCredential',
    'credentialSecret',
    'systemPrompt',
    'system_prompt',
    'llmPrompt',
    'executionAuthority',
    'authorizationSecret',
    'pdpBypass',
    'approvalBypass',
]);
export function assertNoForbiddenContent(payload, depth = 0) {
    if (depth > 10)
        return;
    if (payload === null || payload === undefined)
        return;
    if (typeof payload === 'string') {
        const str = payload;
        if (str.includes('-----BEGIN PRIVATE KEY-----') ||
            str.includes('-----BEGIN RSA PRIVATE KEY-----') ||
            str.includes('-----BEGIN EC PRIVATE KEY-----')) {
            throw new WireTransportError('WIRE_PAYLOAD_FORBIDDEN', 'Wire payload contains raw private key block. Blocked fail-closed.');
        }
        return;
    }
    if (typeof payload !== 'object')
        return;
    const obj = payload;
    for (const [key, value] of Object.entries(obj)) {
        if (FORBIDDEN_KEYS.has(key)) {
            throw new WireTransportError('WIRE_PAYLOAD_FORBIDDEN', `Wire payload contains forbidden security key "${key}". Blocked fail-closed.`);
        }
        if (typeof value === 'string') {
            const strVal = value;
            if (strVal.includes('-----BEGIN PRIVATE KEY-----') ||
                strVal.includes('-----BEGIN RSA PRIVATE KEY-----') ||
                strVal.includes('-----BEGIN EC PRIVATE KEY-----')) {
                throw new WireTransportError('WIRE_PAYLOAD_FORBIDDEN', `Wire payload property "${key}" contains raw private key. Blocked fail-closed.`);
            }
        }
        else if (typeof value === 'object' && value !== null) {
            assertNoForbiddenContent(value, depth + 1);
        }
    }
}
export function createWireEnvelope(options) {
    assertNoForbiddenContent(options.payload);
    const envelope = Object.freeze({
        wireVersion: WIRE_PROTOCOL_VERSION,
        messageId: options.messageId,
        sequence: options.sequence,
        relayId: options.relayId,
        brainId: options.brainId,
        deviceId: options.deviceId,
        sessionId: options.sessionId,
        surfaceId: options.surfaceId,
        surfaceType: options.surfaceType,
        scope: Object.freeze({ ...options.scope }),
        messageCategory: options.messageCategory,
        priority: options.priority ?? 'NORMAL',
        riskLevel: options.riskLevel ?? 'LOW',
        correlationId: options.correlationId ?? `corr_${Date.now()}_${options.sequence}`,
        timestamp: options.timestamp ?? Date.now(),
        payload: options.payload,
        resumeToken: options.resumeToken,
        clientLastAckSeq: options.clientLastAckSeq,
        clientNextSeq: options.clientNextSeq,
    });
    validateWireEnvelope(envelope);
    return envelope;
}
export function validateWireEnvelope(envelope) {
    if (!envelope.messageId || typeof envelope.messageId !== 'string') {
        throw new WireTransportError('WIRE_MALFORMED_FRAME', 'WireEnvelope missing valid messageId.');
    }
    if (typeof envelope.sequence !== 'number' || envelope.sequence < 0) {
        throw new WireTransportError('WIRE_MALFORMED_FRAME', 'WireEnvelope sequence must be a non-negative number.');
    }
    if (!envelope.deviceId || !envelope.sessionId || !envelope.relayId || !envelope.brainId) {
        throw new WireTransportError('WIRE_SCOPE_VIOLATION', 'WireEnvelope missing required core identity tuple.');
    }
    if (!envelope.scope || typeof envelope.scope !== 'object') {
        throw new WireTransportError('WIRE_SCOPE_VIOLATION', 'WireEnvelope missing 9-tuple scope.');
    }
    // Cross-boundary scope verification
    if (envelope.scope.deviceId !== envelope.deviceId ||
        envelope.scope.sessionId !== envelope.sessionId ||
        envelope.scope.relayId !== envelope.relayId ||
        envelope.scope.brainId !== envelope.brainId) {
        throw new WireTransportError('WIRE_SCOPE_VIOLATION', 'WireEnvelope scope mismatch with envelope header identities. Cross-boundary tampering detected.');
    }
    assertNoForbiddenContent(envelope.payload);
}
