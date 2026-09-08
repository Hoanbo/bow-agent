// src/core/wire/wireSessionBinding.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Wire Connection to Remote Session Scope Binding Manager.
//
// Strictly binds physical wire connections to admitted remote sessions while
// preventing cross-device, cross-user, cross-tenant, and cross-brain leakage.
//
// INVARIANTS:
// - SESSION_ID != DEVICE_ID
// - ONE_DEVICE != ONE_SESSION
// - ONE_USER != ONE_DEVICE
// - MULTIPLE_SURFACES != MULTIPLE_BRAINS
import { WireTransportError } from './wireFailure.js';
export class WireSessionBinder {
    connToBinding = new Map();
    sessionToConn = new Map();
    /**
     * Binds an active wire connection to an admitted remote session.
     */
    bind(connectionId, session) {
        if (!connectionId) {
            throw new WireTransportError('WIRE_SESSION_BINDING_FAILED', 'Cannot bind session to empty connectionId.');
        }
        if (!session || !session.sessionId || !session.deviceId) {
            throw new WireTransportError('WIRE_SESSION_BINDING_FAILED', 'Cannot bind invalid or incomplete remote session.');
        }
        // Ensure session is admitted
        if (session.admissionState !== 'ADMITTED') {
            throw new WireTransportError('WIRE_ADMISSION_FAILED', `Cannot bind wire connection to unadmitted session "${session.sessionId}" (state=${session.admissionState}).`);
        }
        const scope = Object.freeze({
            tenantId: session.tenantId,
            userId: session.userId,
            deviceId: session.deviceId,
            relayId: session.relayId,
            brainId: session.brainId,
            surfaceId: session.surfaceId,
            sessionId: session.sessionId,
            connectionId,
            gatewayId: session.gatewayId,
        });
        const binding = Object.freeze({
            connectionId,
            sessionId: session.sessionId,
            deviceId: session.deviceId,
            surfaceId: session.surfaceId,
            relayId: session.relayId,
            brainId: session.brainId,
            scope,
            boundAt: Date.now(),
        });
        this.connToBinding.set(connectionId, binding);
        this.sessionToConn.set(session.sessionId, connectionId);
        return binding;
    }
    /**
     * Unbinds an active wire connection.
     */
    unbind(connectionId) {
        const existing = this.connToBinding.get(connectionId);
        if (existing) {
            this.connToBinding.delete(connectionId);
            this.sessionToConn.delete(existing.sessionId);
        }
        return existing;
    }
    getBinding(connectionId) {
        return this.connToBinding.get(connectionId);
    }
    getConnectionForSession(sessionId) {
        return this.sessionToConn.get(sessionId);
    }
    /**
     * Validates that an incoming wire envelope's scope matches the bound connection scope.
     * Rejects any cross-boundary tampering fail-closed.
     */
    validateScopeMatch(connectionId, incomingScope) {
        const binding = this.connToBinding.get(connectionId);
        if (!binding) {
            throw new WireTransportError('WIRE_SCOPE_VIOLATION', `No session bound to connection "${connectionId}". Message rejected fail-closed.`);
        }
        if (binding.scope.deviceId !== incomingScope.deviceId ||
            binding.scope.sessionId !== incomingScope.sessionId ||
            binding.scope.relayId !== incomingScope.relayId ||
            binding.scope.brainId !== incomingScope.brainId ||
            binding.scope.tenantId !== incomingScope.tenantId ||
            binding.scope.userId !== incomingScope.userId) {
            throw new WireTransportError('WIRE_SCOPE_VIOLATION', 'Cross-boundary scope mismatch detected on wire connection! Frame rejected fail-closed.');
        }
    }
    clear() {
        this.connToBinding.clear();
        this.sessionToConn.clear();
    }
}
