// src/core/internet/internetRelayBridge.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Internet Relay Bridge — binds an admitted Internet Edge session to the
// relay fabric (SecureBrainRelayRuntime / RelayGatewayRuntime).
//
// INVARIANT: Only ADMITTED sessions (with valid, unconsumed tokens) may bind.
// INVARIANT: Relay binding does NOT create a new brain session.
// INVARIANT: Relay binding does NOT grant execution authority.
// INVARIANT: ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN — the bridge enforces this
//            by preventing duplicate bindings per device identity.
import { randomBytes } from 'node:crypto';
import { appendInternetAuditEvent } from './internetAudit.js';
import { InternetEdgeError } from './internetFailure.js';
export class InternetRelayBridge {
    _bindings = new Map();
    _ledger;
    constructor(ledger) {
        this._ledger = ledger ?? { events: [] };
    }
    /** Number of currently active (BOUND) relay bindings. */
    get activeBindingCount() {
        let count = 0;
        for (const b of this._bindings.values()) {
            if (b.state === 'BOUND')
                count++;
        }
        return count;
    }
    /**
     * Binds an admitted session to the relay fabric.
     *
     * @param token  A consumed (single-use) admission token from InternetAdmissionBridge.
     * @returns      The relay binding record.
     *
     * INVARIANT: Duplicate bindings for the same sessionId are rejected.
     * INVARIANT: Token must be consumed (has consumedAt) before calling this.
     */
    bind(token) {
        if (!token.consumedAt) {
            throw new InternetEdgeError('INTERNET_RELAY_BIND_FAILED', 'Relay binding requires a consumed admission token. Unconsumed tokens are rejected fail-closed.');
        }
        if (this._bindings.has(token.sessionId)) {
            const existing = this._bindings.get(token.sessionId);
            if (existing.state === 'BOUND') {
                throw new InternetEdgeError('INTERNET_RELAY_BIND_FAILED', `Session "${token.sessionId}" is already bound to the relay fabric. ONE_BRAIN invariant enforced.`);
            }
        }
        const bindingId = `rbind_${Date.now()}_${randomBytes(4).toString('hex')}`;
        const binding = Object.freeze({
            bindingId,
            sessionId: token.sessionId,
            certFingerprint: token.certFingerprint,
            tlsVersion: token.tlsVersion,
            cipherSuite: token.cipherSuite,
            boundAt: Date.now(),
            state: 'BOUND',
        });
        this._bindings.set(token.sessionId, binding);
        appendInternetAuditEvent(this._ledger, {
            type: 'EDGE_RELAY_BOUND',
            sessionId: token.sessionId,
            bindingId,
            timestamp: binding.boundAt,
        });
        return binding;
    }
    /**
     * Unbinds (removes from relay fabric) the session.
     * No-op if the session was never bound or already unbound.
     */
    unbind(sessionId, reason) {
        const existing = this._bindings.get(sessionId);
        if (!existing || existing.state !== 'BOUND')
            return;
        const updated = Object.freeze({
            ...existing,
            state: 'UNBOUND_CLEANLY',
        });
        this._bindings.set(sessionId, updated);
        appendInternetAuditEvent(this._ledger, {
            type: 'EDGE_RELAY_UNBOUND',
            sessionId,
            reason,
            timestamp: Date.now(),
        });
    }
    /**
     * Returns the current binding for a session, or undefined.
     */
    getBinding(sessionId) {
        return this._bindings.get(sessionId);
    }
    /**
     * Returns a snapshot of all active (BOUND) relay bindings.
     */
    getActiveBindings() {
        const result = [];
        for (const b of this._bindings.values()) {
            if (b.state === 'BOUND')
                result.push(b);
        }
        return Object.freeze(result);
    }
}
