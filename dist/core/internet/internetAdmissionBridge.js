// src/core/internet/internetAdmissionBridge.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// The Internet Admission Bridge is the ONLY gateway between the Internet Edge
// and the relay fabric. It issues single-use admission tokens after successful
// TLS + certificate validation, and consumes them at relay binding time.
//
// INVARIANT: ADMISSION_BRIDGE is the ONLY gateway between Internet Edge and relay fabric.
// INVARIANT: TLS admission token is single-use — consumed on relay bind.
// INVARIANT: Token issuance does NOT imply authorization to execute agent tools.
// INVARIANT: Token expiry is enforced strictly; expired tokens are rejected fail-closed.
import { randomBytes } from 'node:crypto';
import { appendInternetAuditEvent } from './internetAudit.js';
import { InternetEdgeError } from './internetFailure.js';
/** Token validity window in milliseconds. Tokens expire if not consumed. */
const ADMISSION_TOKEN_TTL_MS = 5_000;
/** Maximum number of unconsumed tokens allowed in the bridge at once. */
const MAX_PENDING_TOKENS = 64;
export class InternetAdmissionBridge {
    _pendingTokens = new Map();
    _ledger;
    _ttlMs;
    _maxPending;
    constructor(config = {}, ledger) {
        this._ttlMs = config.tokenTtlMs ?? ADMISSION_TOKEN_TTL_MS;
        this._maxPending = config.maxPendingTokens ?? MAX_PENDING_TOKENS;
        this._ledger = ledger ?? { events: [] };
    }
    /** Number of tokens currently pending consumption. */
    get pendingCount() { return this._pendingTokens.size; }
    /**
     * Issues a single-use admission token for a successfully validated TLS session.
     *
     * INVARIANT: Token issuance requires INTERNET_ADMITTED state (enforced by caller).
     * INVARIANT: Token is NOT an authorization grant.
     * Throws InternetEdgeError if the pending token limit is reached.
     */
    issueToken(params) {
        this.evictExpiredTokens();
        if (this._pendingTokens.size >= this._maxPending) {
            throw new InternetEdgeError('INTERNET_OVERLOAD_REJECTED', `Admission bridge token limit reached (${this._pendingTokens.size}/${this._maxPending}). Rejecting new token issuance.`);
        }
        const token = Object.freeze({
            sessionId: params.sessionId,
            tlsVersion: params.tlsVersion,
            cipherSuite: params.cipherSuite,
            certFingerprint: params.certFingerprint,
            issuedAt: Date.now(),
        });
        const tokenKey = `${params.sessionId}_${randomBytes(4).toString('hex')}`;
        this._pendingTokens.set(tokenKey, token);
        appendInternetAuditEvent(this._ledger, {
            type: 'EDGE_ADMISSION_TOKEN_ISSUED',
            sessionId: params.sessionId,
            tokenKey,
            timestamp: token.issuedAt,
        });
        return token;
    }
    /**
     * Consumes a pending admission token to bind the session to the relay fabric.
     * Token is single-use — removed from the bridge on consumption.
     *
     * Returns the admission decision:
     *  - ADMIT: token valid and consumed
     *  - REJECT_TLS / REJECT_CERT: token integrity check failed
     *  - REJECT_POLICY: token expired
     */
    consumeToken(sessionId, expectedFingerprint) {
        this.evictExpiredTokens();
        // Find the first unexpired token for this session
        let matchKey;
        let matchToken;
        for (const [key, token] of this._pendingTokens) {
            if (token.sessionId === sessionId) {
                matchKey = key;
                matchToken = token;
                break;
            }
        }
        if (!matchKey || !matchToken) {
            return { decision: 'REJECT_POLICY', reason: `No pending token found for session "${sessionId}".` };
        }
        const age = Date.now() - matchToken.issuedAt;
        if (age > this._ttlMs) {
            this._pendingTokens.delete(matchKey);
            return { decision: 'REJECT_POLICY', reason: `Admission token for session "${sessionId}" expired after ${age}ms (TTL: ${this._ttlMs}ms).` };
        }
        if (matchToken.certFingerprint !== expectedFingerprint) {
            this._pendingTokens.delete(matchKey);
            return { decision: 'REJECT_CERT', reason: 'Admission token fingerprint mismatch.' };
        }
        // Consume the token — it is now single-use exhausted
        this._pendingTokens.delete(matchKey);
        const consumed = Object.freeze({
            ...matchToken,
            consumedAt: Date.now(),
        });
        appendInternetAuditEvent(this._ledger, {
            type: 'EDGE_ADMISSION_TOKEN_CONSUMED',
            sessionId,
            timestamp: consumed.consumedAt,
        });
        return { decision: 'ADMIT', token: consumed };
    }
    /**
     * Removes all tokens that have exceeded their TTL.
     * Called automatically before issuance and consumption.
     */
    evictExpiredTokens() {
        const now = Date.now();
        for (const [key, token] of this._pendingTokens) {
            if (now - token.issuedAt > this._ttlMs) {
                this._pendingTokens.delete(key);
            }
        }
    }
    /** Snapshot for testing and AgentLoop observation. */
    getSnapshot() {
        return Object.freeze({
            pendingCount: this._pendingTokens.size,
            ttlMs: this._ttlMs,
            maxPending: this._maxPending,
        });
    }
}
