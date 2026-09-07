// src/core/connection/connectionRuntime.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - Central ConnectionRuntime orchestrating adapters, connections, sessions, and audits.
// - ZERO tool execution, ZERO LLM invocation, ZERO Brain memory mutation, ZERO PDP usurpation.
// - CONNECTED != AUTHENTICATED, AUTHENTICATED != AUTHORIZED, AUTHORIZED != EXECUTED.
import { assertValidConnectionStateTransition as assertValidConnectionTransition, assertValidSessionTransition } from './connectionTransitions.js';
import { createDeterministicSessionId } from './connectionIdentity.js';
import { createConnectionScope } from './connectionScope.js';
import { createHandshakeHello, createCapabilityOffer, createAuthRequest, createSessionEstablished, createHandshakeReady, } from './connectionHandshake.js';
import { authenticateConnectionPeer } from './connectionAuthentication.js';
import { authorizeConnectionCapabilities } from './connectionAuthorization.js';
import { createConnectionSessionSnapshot, } from './connectionSession.js';
import { ConnectionSequenceTracker } from './connectionOrdering.js';
import { ConnectionReplayDetector } from './connectionReplay.js';
import { createConnectionHeartbeatSignal, } from './connectionHeartbeat.js';
import { evaluateConnectionReconnect, } from './connectionReconnect.js';
import { assertQueueCapacity } from './connectionBackpressure.js';
import { createConnectionAuditRecord, ConnectionAuditLedger } from './connectionAudit.js';
import { ConnectionRegistry } from './connectionRegistry.js';
import { ConnectionInMemoryAdapter } from './connectionInMemoryAdapter.js';
export class ConnectionRuntime {
    registry = new ConnectionRegistry();
    adapters = new Map();
    sequenceTrackers = new Map();
    replayDetectors = new Map();
    auditLedger = new ConnectionAuditLedger();
    outboundQueues = new Map();
    messageListeners = [];
    constructor() {
        // Register default deterministic in-memory adapter
        const defaultAdapter = new ConnectionInMemoryAdapter('in_memory_default');
        this.registerAdapter(defaultAdapter, ['BOW-Mobile', 'BOW-Robot', 'Desktop', 'Web', 'Voice']);
    }
    getRegistry() {
        return this.registry;
    }
    getAuditLedger() {
        return this.auditLedger;
    }
    getConnection(connectionId) {
        return this.registry.getConnection(connectionId);
    }
    registerAdapter(adapter, supportedSurfaces) {
        this.adapters.set(adapter.adapterId, adapter);
        this.registry.registerAdapterBinding({
            adapterId: adapter.adapterId,
            transportType: adapter.transportType,
            supportedSurfaces: [...supportedSurfaces],
            registeredAt: new Date().toISOString(),
        });
        adapter.onReceive(async (msg) => {
            await this.receiveMessage(msg);
        });
        adapter.onError((err) => {
            this.auditLedger.record(createConnectionAuditRecord({
                userId: 'system',
                sessionId: 'system',
                brainId: 'system',
                surfaceId: 'system',
                transportId: 'system',
                gatewayId: 'system',
                adapterId: adapter.adapterId,
                connectionId: 'system',
            }, 'SECURITY_VIOLATION_BLOCKED', { error: err.message }));
        });
    }
    /**
     * Initiates a new connection establishing INITIALIZING -> CONNECTING -> CONNECTED
     */
    async createConnection(identity) {
        const scopeStr = createConnectionScope(identity);
        const adapter = this.adapters.get(identity.adapterId);
        if (!adapter) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Unknown adapter: ${identity.adapterId}`);
        }
        // Record audit: CONNECTION_INITIATED
        this.auditLedger.record(createConnectionAuditRecord(identity, 'CONNECTION_INITIATED'));
        const sessionId = createDeterministicSessionId({
            connectionId: identity.connectionId,
            peerId: `peer_init_${identity.userId}`,
            brainId: identity.brainId,
            sessionId: identity.sessionId,
        });
        // Create sequence tracker & replay detector
        this.sequenceTrackers.set(identity.connectionId, new ConnectionSequenceTracker(identity));
        this.replayDetectors.set(identity.connectionId, new ConnectionReplayDetector(identity));
        this.outboundQueues.set(identity.connectionId, []);
        // Connect adapter
        await adapter.connect(identity);
        // Create session snapshot in CONNECTED state
        const snapshot = createConnectionSessionSnapshot({
            sessionId,
            connectionId: identity.connectionId,
            peerId: `peer_init_${identity.userId}`,
            scopeIdentity: identity,
            connectionState: 'CONNECTED',
            sessionState: 'CREATED',
        });
        this.registry.registerConnection(snapshot);
        this.auditLedger.record(createConnectionAuditRecord(identity, 'CONNECTION_ESTABLISHED', { sessionId }));
        return snapshot;
    }
    /**
     * Executes authoritative handshake negotiation:
     * CONNECTED -> AUTHENTICATING -> AUTHENTICATED -> AUTHORIZING -> AUTHORIZED -> READY
     */
    async performHandshake(identity, requestedCaps, creds) {
        const existing = this.registry.getConnection(identity.connectionId, identity);
        if (!existing) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Connection not found: ${identity.connectionId}`);
        }
        assertValidConnectionTransition(existing.connectionState, 'AUTHENTICATING');
        assertValidSessionTransition(existing.sessionState, 'NEGOTIATING');
        this.auditLedger.record(createConnectionAuditRecord(identity, 'HANDSHAKE_STARTED'));
        // Step 1: HELLO
        createHandshakeHello(identity);
        // Step 2 & 3: CAPABILITY_OFFER / ACCEPT
        createCapabilityOffer(identity, requestedCaps);
        // Step 4: AUTH_REQUEST & AUTHENTICATION
        createAuthRequest(identity, { principal: creds.principal });
        const authResult = authenticateConnectionPeer(identity, creds);
        if (!authResult.authenticated) {
            this.auditLedger.record(createConnectionAuditRecord(identity, 'AUTHENTICATION_FAILED', { error: authResult.error }));
            const failedSnapshot = createConnectionSessionSnapshot({
                ...existing,
                connectionState: 'FAILED',
                sessionState: 'TERMINATED',
                authenticationState: 'FAILED',
            });
            this.registry.registerConnection(failedSnapshot);
            throw new Error(`[CONNECTION_AUTHENTICATION_FAILED] Peer authentication failed: ${authResult.error}`);
        }
        this.auditLedger.record(createConnectionAuditRecord(identity, 'AUTHENTICATION_SUCCESS', { peerId: authResult.peerId }));
        assertValidConnectionTransition('AUTHENTICATING', 'AUTHENTICATED');
        // Step 5: AUTHORIZATION
        assertValidConnectionTransition('AUTHENTICATED', 'AUTHORIZING');
        const authzResult = authorizeConnectionCapabilities(identity, requestedCaps);
        if (!authzResult.authorized) {
            this.auditLedger.record(createConnectionAuditRecord(identity, 'AUTHORIZATION_DENIED', { error: authzResult.error }));
            const failedSnapshot = createConnectionSessionSnapshot({
                ...existing,
                connectionState: 'FAILED',
                sessionState: 'TERMINATED',
                authorizationState: 'DENIED',
            });
            this.registry.registerConnection(failedSnapshot);
            throw new Error(`[CONNECTION_AUTHORIZATION_DENIED] Authorization denied: ${authzResult.error}`);
        }
        assertValidConnectionTransition('AUTHORIZING', 'AUTHORIZED');
        this.auditLedger.record(createConnectionAuditRecord(identity, 'AUTHORIZATION_SUCCESS', {
            grantedCapabilities: authzResult.grantedCapabilities,
        }));
        // Step 6 & 7: SESSION_ESTABLISHED & READY
        createSessionEstablished(identity, existing.sessionId);
        createHandshakeReady(identity);
        assertValidConnectionTransition('AUTHORIZED', 'READY');
        assertValidSessionTransition('NEGOTIATING', 'ESTABLISHED');
        const readySnapshot = createConnectionSessionSnapshot({
            ...existing,
            peerId: authResult.peerId,
            authenticationState: 'AUTHENTICATED',
            authorizationState: 'AUTHORIZED',
            grantedCapabilities: authzResult.grantedCapabilities,
            connectionState: 'READY',
            sessionState: 'ESTABLISHED',
        });
        this.registry.registerConnection(readySnapshot);
        this.auditLedger.record(createConnectionAuditRecord(identity, 'HANDSHAKE_COMPLETED'));
        return readySnapshot;
    }
    /**
     * Dispatches an outbound message across the connection runtime
     */
    async sendMessage(message) {
        const conn = this.registry.getConnection(message.scopeIdentity.connectionId, message.scopeIdentity);
        if (!conn) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Connection not found: ${message.scopeIdentity.connectionId}`);
        }
        if (conn.connectionState !== 'READY' && conn.connectionState !== 'DEGRADED') {
            throw new Error(`[CONNECTION_INVALID_STATE] Cannot send message on connection in state ${conn.connectionState}`);
        }
        const queue = this.outboundQueues.get(message.scopeIdentity.connectionId) || [];
        const isCritical = message.channel === 'CONTROL' || message.channel === 'ERROR';
        assertQueueCapacity(queue.length, 1000, isCritical);
        const tracker = this.sequenceTrackers.get(message.scopeIdentity.connectionId);
        if (!tracker) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Sequence tracker missing for ${message.scopeIdentity.connectionId}`);
        }
        const adapter = this.adapters.get(message.scopeIdentity.adapterId);
        if (!adapter) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Adapter missing: ${message.scopeIdentity.adapterId}`);
        }
        await adapter.send(message);
        // Update connection snapshot
        const updated = createConnectionSessionSnapshot({
            ...conn,
            lastSentSequence: message.sequence,
            observationalMetadata: {
                ...conn.observationalMetadata,
                totalSent: conn.observationalMetadata.totalSent + 1,
                lastActiveAt: new Date().toISOString(),
            },
        });
        this.registry.registerConnection(updated);
        this.auditLedger.record(createConnectionAuditRecord(message.scopeIdentity, 'MESSAGE_SENT', {
            messageId: message.messageId,
            sequence: message.sequence,
            channel: message.channel,
            type: message.messageType,
        }));
    }
    /**
     * Processes an inbound message arriving from the network adapter
     */
    async receiveMessage(message) {
        const conn = this.registry.getConnection(message.scopeIdentity.connectionId, message.scopeIdentity);
        if (!conn) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Connection not found: ${message.scopeIdentity.connectionId}`);
        }
        // 1. Replay defense
        const replayDetector = this.replayDetectors.get(message.scopeIdentity.connectionId);
        if (!replayDetector) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Replay detector missing for ${message.scopeIdentity.connectionId}`);
        }
        replayDetector.record(message);
        // 2. Ordering & monotonic sequence
        const tracker = this.sequenceTrackers.get(message.scopeIdentity.connectionId);
        if (!tracker) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Sequence tracker missing for ${message.scopeIdentity.connectionId}`);
        }
        tracker.commitInbound(message);
        // 3. Update connection snapshot
        const updated = createConnectionSessionSnapshot({
            ...conn,
            lastReceivedSequence: message.sequence,
            observationalMetadata: {
                ...conn.observationalMetadata,
                totalReceived: conn.observationalMetadata.totalReceived + 1,
                lastActiveAt: new Date().toISOString(),
            },
        });
        this.registry.registerConnection(updated);
        this.auditLedger.record(createConnectionAuditRecord(message.scopeIdentity, 'MESSAGE_RECEIVED', {
            messageId: message.messageId,
            sequence: message.sequence,
            channel: message.channel,
            type: message.messageType,
        }));
        // 4. Notify listeners
        for (const listener of this.messageListeners) {
            await listener(message);
        }
    }
    onMessage(handler) {
        this.messageListeners.push(handler);
    }
    /**
     * Sends heartbeat signal
     */
    async sendHeartbeat(connectionId) {
        const conn = this.registry.getConnection(connectionId);
        if (!conn) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Connection not found: ${connectionId}`);
        }
        const tracker = this.sequenceTrackers.get(connectionId);
        const seq = tracker ? tracker.nextOutboundSequence() : 1;
        const signal = createConnectionHeartbeatSignal(conn.scopeIdentity, seq);
        this.auditLedger.record(createConnectionAuditRecord(conn.scopeIdentity, 'HEARTBEAT_SENT', {
            heartbeatId: signal.heartbeatId,
            sequence: signal.sequence,
        }));
        return signal;
    }
    /**
     * Receives heartbeat ack
     */
    async receiveHeartbeatAck(connectionId, ack) {
        const conn = this.registry.getConnection(connectionId);
        if (!conn) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Connection not found: ${connectionId}`);
        }
        const updated = createConnectionSessionSnapshot({
            ...conn,
            lastAcknowledgedSequence: ack.ackedSequence,
            heartbeatState: 'NORMAL',
            connectionHealth: 'HEALTHY',
        });
        this.registry.registerConnection(updated);
        this.auditLedger.record(createConnectionAuditRecord(conn.scopeIdentity, 'HEARTBEAT_ACKED', {
            heartbeatId: ack.heartbeatId,
            ackedSequence: ack.ackedSequence,
        }));
    }
    /**
     * Reconnects and resumes a suspended connection session
     */
    async reconnect(req) {
        const existing = this.registry.getConnection(req.scopeIdentity.connectionId, req.scopeIdentity);
        if (!existing) {
            throw new Error(`[CONNECTION_RUNTIME_ERROR] Connection not found for reconnect: ${req.scopeIdentity.connectionId}`);
        }
        this.auditLedger.record(createConnectionAuditRecord(req.scopeIdentity, 'RECONNECT_REQUESTED'));
        const evalResult = evaluateConnectionReconnect(existing, req);
        if (!evalResult.accepted) {
            this.auditLedger.record(createConnectionAuditRecord(req.scopeIdentity, 'RECONNECT_FAILED', { error: evalResult.error }));
            return evalResult;
        }
        assertValidConnectionTransition(existing.connectionState, 'RECONNECTING');
        assertValidConnectionTransition('RECONNECTING', 'READY');
        const resumedSnapshot = createConnectionSessionSnapshot({
            ...existing,
            connectionState: 'READY',
            sessionState: 'ACTIVE',
        });
        this.registry.registerConnection(resumedSnapshot);
        this.auditLedger.record(createConnectionAuditRecord(req.scopeIdentity, 'RECONNECT_SUCCEEDED', {
            sessionId: req.sessionId,
            resumeSequence: evalResult.resumeSequence,
        }));
        return evalResult;
    }
    /**
     * Gracefully disconnects a connection
     */
    async disconnect(connectionId) {
        const conn = this.registry.getConnection(connectionId);
        if (!conn)
            return;
        assertValidConnectionTransition(conn.connectionState, 'DISCONNECTING');
        assertValidConnectionTransition('DISCONNECTING', 'DISCONNECTED');
        const adapter = this.adapters.get(conn.scopeIdentity.adapterId);
        if (adapter) {
            await adapter.disconnect(connectionId);
        }
        const disconnectedSnapshot = createConnectionSessionSnapshot({
            ...conn,
            connectionState: 'DISCONNECTED',
            sessionState: 'SUSPENDED',
        });
        this.registry.registerConnection(disconnectedSnapshot);
        this.auditLedger.record(createConnectionAuditRecord(conn.scopeIdentity, 'DISCONNECTED'));
    }
    /**
     * Shuts down all connections and adapters
     */
    async shutdown() {
        for (const [adapterId, adapter] of this.adapters.entries()) {
            await adapter.dispose();
        }
        this.adapters.clear();
        this.registry.clear();
        this.sequenceTrackers.clear();
        this.replayDetectors.clear();
        this.outboundQueues.clear();
        this.messageListeners.length = 0;
    }
}
