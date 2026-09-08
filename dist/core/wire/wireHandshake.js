// src/core/wire/wireHandshake.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Multi-Step Cryptographic Handshake Coordinator.
//
// Negotiates wire protocol version, exchanges nonces, and issues zero-trust
// admission challenges before payload transmission can be permitted.
import { randomBytes } from 'node:crypto';
import { WIRE_PROTOCOL_VERSION } from './wireTypes.js';
import { WireTransportError } from './wireFailure.js';
export const HANDSHAKE_TIMEOUT_MS = 5000;
export const MAX_FRAME_SIZE_BYTES = 1_048_576; // 1MB
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 15000;
export class WireHandshakeCoordinator {
    options;
    supportedVersions;
    heartbeatIntervalMs;
    maxFrameSize;
    constructor(options) {
        this.options = options;
        this.supportedVersions = options?.supportedVersions ?? [WIRE_PROTOCOL_VERSION];
        this.heartbeatIntervalMs = options?.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
        this.maxFrameSize = options?.maxFrameSize ?? MAX_FRAME_SIZE_BYTES;
    }
    /**
     * Client-side: Creates the initial handshake request.
     */
    createClientRequest(params) {
        const clientNonce = randomBytes(16).toString('hex');
        return Object.freeze({
            wireVersion: WIRE_PROTOCOL_VERSION,
            clientNonce,
            deviceId: params.deviceId,
            surfaceId: params.surfaceId,
            surfaceType: params.surfaceType,
            timestamp: Date.now(),
            clientCapabilities: Object.freeze([...(params.capabilities ?? ['BIDIRECTIONAL_FRAMES', 'BACKPRESSURE_SIGNALING'])]),
        });
    }
    /**
     * Gateway/Server-side: Validates client request and returns response/challenge.
     */
    evaluateServerRequest(request, assignedConnectionId, assignedSessionId) {
        // 1. Version validation
        if (!this.supportedVersions.includes(request.wireVersion)) {
            return Object.freeze({
                accepted: false,
                wireVersion: WIRE_PROTOCOL_VERSION,
                gatewayNonce: randomBytes(16).toString('hex'),
                assignedConnectionId,
                heartbeatIntervalMs: this.heartbeatIntervalMs,
                maxFrameSize: this.maxFrameSize,
                rejectionReason: `WIRE_PROTOCOL_MISMATCH: Server supports [${this.supportedVersions.join(', ')}], client requested ${request.wireVersion}`,
            });
        }
        // 2. Identity validation
        if (!request.deviceId || typeof request.deviceId !== 'string') {
            return Object.freeze({
                accepted: false,
                wireVersion: WIRE_PROTOCOL_VERSION,
                gatewayNonce: randomBytes(16).toString('hex'),
                assignedConnectionId,
                heartbeatIntervalMs: this.heartbeatIntervalMs,
                maxFrameSize: this.maxFrameSize,
                rejectionReason: 'MALFORMED_HANDSHAKE: Missing deviceId in handshake request',
            });
        }
        // 3. Generate ephemeral challenge for admission bridge if configured
        const gatewayNonce = randomBytes(16).toString('hex');
        const challenge = this.options?.challengeGenerator
            ? this.options.challengeGenerator(request.deviceId)
            : randomBytes(32).toString('hex');
        const sessionId = assignedSessionId ?? `sess_${request.deviceId}_${Date.now()}`;
        return Object.freeze({
            accepted: true,
            wireVersion: WIRE_PROTOCOL_VERSION,
            gatewayNonce,
            assignedConnectionId,
            assignedSessionId: sessionId,
            heartbeatIntervalMs: this.heartbeatIntervalMs,
            maxFrameSize: this.maxFrameSize,
            challenge,
        });
    }
    /**
     * Client-side: Validates server response to handshake request.
     */
    verifyServerResponse(request, response) {
        if (!response.accepted) {
            throw new WireTransportError('WIRE_HANDSHAKE_TIMEOUT', `Handshake rejected by gateway: ${response.rejectionReason ?? 'Unknown reason'}`);
        }
        if (response.wireVersion !== request.wireVersion) {
            throw new WireTransportError('WIRE_PROTOCOL_MISMATCH', `Gateway negotiated unexpected wireVersion ${response.wireVersion} (expected ${request.wireVersion})`);
        }
        if (!response.assignedConnectionId) {
            throw new WireTransportError('WIRE_HANDSHAKE_TIMEOUT', 'Gateway handshake response missing assignedConnectionId.');
        }
    }
}
