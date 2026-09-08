// src/core/wire/wireClient.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Surface-Side Real Wire Client Runtime.
//
// Manages physical connection establishment, multi-step cryptographic handshake,
// zero-trust challenge response (without private key leakage), and network roaming.
//
// INVARIANTS:
// - RECONNECT != RE-EXECUTE
// - POSSESSING_DEVICE_ID != POSSESSING_DEVICE_KEY
// - NETWORK_LOCATION != DEVICE_TRUST
import { WireHandshakeCoordinator } from './wireHandshake.js';
import { WireAdmissionBridge } from './wireAdmissionBridge.js';
import { WireReconnectScheduler } from './wireReconnect.js';
import { WireTransportError } from './wireFailure.js';
import { createWireEnvelope } from './wireEnvelope.js';
import { createWireFrame } from './wireFrame.js';
import { assertValidWireTransition } from './wireTransitions.js';
export class RealWireClient {
    state = 'WIRE_DISCONNECTED';
    connection;
    currentSessionId;
    sequenceCounter = 0;
    envelopeHandlers = [];
    deviceId;
    surfaceId;
    surfaceType;
    tenantId;
    userId;
    brainId;
    relayId;
    transportAdapter;
    admissionBridge;
    handshakeCoordinator;
    reconnectScheduler;
    constructor(options) {
        this.deviceId = options.deviceId;
        this.surfaceId = options.surfaceId;
        this.surfaceType = options.surfaceType;
        this.tenantId = options.tenantId;
        this.userId = options.userId;
        this.brainId = options.brainId;
        this.relayId = options.relayId;
        this.transportAdapter = options.transportAdapter;
        this.admissionBridge = options.admissionBridge ?? new WireAdmissionBridge();
        this.handshakeCoordinator = options.handshakeCoordinator ?? new WireHandshakeCoordinator();
        this.reconnectScheduler = options.reconnectScheduler ?? new WireReconnectScheduler();
    }
    async connect(endpoint) {
        this.transitionState('WIRE_CONNECTING', 'Initiating connection');
        // 1. Establish physical connection
        const conn = await this.transportAdapter.connect(endpoint);
        this.connection = conn;
        this.transitionState('WIRE_CONNECTED', 'Physical connection opened');
        // 2. Initiate handshake
        this.transitionState('WIRE_HANDSHAKING', 'Sending handshake request');
        const req = this.handshakeCoordinator.createClientRequest({
            deviceId: this.deviceId,
            surfaceId: this.surfaceId,
            surfaceType: this.surfaceType,
        });
        const handshakeFrame = createWireFrame({
            frameType: 'HANDSHAKE',
            sequence: ++this.sequenceCounter,
            payload: JSON.stringify(req),
        });
        let pendingReject;
        conn.onClose((reason) => {
            if (this.state !== 'WIRE_CLOSED' && this.state !== 'WIRE_RECONNECTING') {
                this.transitionState('WIRE_DISCONNECTED', reason ?? 'Connection closed by peer');
            }
            if (pendingReject) {
                pendingReject(new WireTransportError('WIRE_CONNECTION_FAILED', reason ?? 'Connection closed during handshake'));
                pendingReject = undefined;
            }
        });
        // Await handshake and admission response
        const responsePromise = new Promise((resolve, reject) => {
            pendingReject = reject;
            conn.onFrame(async (frame) => {
                if (frame.frameType === 'HANDSHAKE_ACK') {
                    try {
                        const resp = JSON.parse(frame.payload);
                        this.handshakeCoordinator.verifyServerResponse(req, resp);
                        this.transitionState('WIRE_VALIDATING', 'Handshake response accepted');
                        // Zero-Trust Proof generation (if challenge present)
                        if (resp.challenge) {
                            this.transitionState('WIRE_ADMISSION_PENDING', 'Solving zero-trust challenge');
                            const proof = this.admissionBridge.generateProofForChallenge(this.deviceId, resp.challenge);
                            // Send proof frame
                            const proofFrame = createWireFrame({
                                frameType: 'DATA',
                                sequence: ++this.sequenceCounter,
                                payload: JSON.stringify({
                                    type: 'ADMISSION_PROOF',
                                    proof,
                                    deviceId: this.deviceId,
                                    surfaceId: this.surfaceId,
                                    surfaceType: this.surfaceType,
                                }),
                            });
                            await conn.send(proofFrame);
                            // Wait for ADMISSION_CONFIRMATION below
                        }
                        else {
                            this.transitionState('WIRE_ADMITTED', 'Admission confirmed');
                            this.transitionState('WIRE_SESSION_BINDING', 'Binding session');
                            this.currentSessionId = resp.assignedSessionId ?? this.currentSessionId ?? `sess_${this.deviceId}_${Date.now()}`;
                            this.transitionState('WIRE_ACTIVE', 'Ready for frame transmission');
                            pendingReject = undefined;
                            resolve();
                        }
                    }
                    catch (err) {
                        this.transitionState('WIRE_REJECTED', err.message);
                        pendingReject = undefined;
                        reject(err);
                    }
                }
                else if (frame.frameType === 'DATA') {
                    try {
                        const parsed = JSON.parse(frame.payload);
                        if (parsed.type === 'ADMISSION_CONFIRMATION') {
                            this.transitionState('WIRE_ADMITTED', 'Admission confirmed');
                            this.transitionState('WIRE_SESSION_BINDING', 'Binding session');
                            this.currentSessionId = parsed.sessionId ?? this.currentSessionId ?? `sess_${this.deviceId}_${Date.now()}`;
                            this.transitionState('WIRE_ACTIVE', 'Ready for frame transmission');
                            pendingReject = undefined;
                            resolve();
                            return;
                        }
                        // Normal envelope dispatch to handlers
                        if (parsed.messageId && parsed.scope) {
                            const env = parsed;
                            for (const handler of this.envelopeHandlers) {
                                handler(env);
                            }
                        }
                    }
                    catch {
                        // Ignored malformed payload
                    }
                }
            });
        });
        await conn.send(handshakeFrame);
        await responsePromise;
    }
    async sendEnvelope(params) {
        if (this.state !== 'WIRE_ACTIVE' && this.state !== 'WIRE_DEGRADED') {
            throw new WireTransportError('WIRE_CONNECTION_FAILED', `Cannot send envelope in client state "${this.state}".`);
        }
        if (!this.connection) {
            throw new WireTransportError('WIRE_CONNECTION_FAILED', 'No active wire connection available.');
        }
        const envelope = createWireEnvelope({
            messageId: `msg_${this.deviceId}_${Date.now()}_${++this.sequenceCounter}`,
            sequence: this.sequenceCounter,
            relayId: this.relayId,
            brainId: this.brainId,
            deviceId: this.deviceId,
            sessionId: this.currentSessionId ?? `sess_${this.deviceId}`,
            surfaceId: this.surfaceId,
            surfaceType: this.surfaceType,
            scope: {
                tenantId: this.tenantId,
                userId: this.userId,
                deviceId: this.deviceId,
                relayId: this.relayId,
                brainId: this.brainId,
                surfaceId: this.surfaceId,
                sessionId: this.currentSessionId ?? `sess_${this.deviceId}`,
                connectionId: this.connection.connectionId,
                gatewayId: 'gw_relay_v4',
            },
            messageCategory: params.messageCategory,
            priority: params.priority,
            riskLevel: params.riskLevel,
            correlationId: params.correlationId,
            payload: params.payload,
        });
        const frame = createWireFrame({
            frameType: 'DATA',
            sequence: envelope.sequence,
            payload: JSON.stringify(envelope),
        });
        await this.connection.send(frame);
    }
    onEnvelope(handler) {
        this.envelopeHandlers.push(handler);
    }
    /**
     * Simulates network roaming to another network (e.g. WiFi -> 4G -> 5G).
     * Device identity remains invariant! RECONNECT != RE-EXECUTE.
     */
    async roamToNetwork(params) {
        this.reconnectScheduler.recordRoamingEvent({
            deviceId: this.deviceId,
            currentNetworkType: params.newNetworkType,
            currentIp: params.newIp,
        });
        this.transitionState('WIRE_RECONNECTING', `Roaming to ${params.newNetworkType}`);
        if (this.connection) {
            await this.connection.close('Roaming transition');
            this.connection = undefined;
        }
        // Connect on new network endpoint
        await this.connect(params.endpoint);
    }
    async close(reason = 'Client shutdown') {
        if (this.state === 'WIRE_CLOSED')
            return;
        this.transitionState('WIRE_CLOSED', reason);
        if (this.connection) {
            const conn = this.connection;
            this.connection = undefined;
            await conn.close(reason);
        }
    }
    getSessionId() {
        return this.currentSessionId;
    }
    getDeviceId() {
        return this.deviceId;
    }
    transitionState(newState, reason) {
        assertValidWireTransition(this.state, newState, reason);
        this.state = newState;
    }
}
