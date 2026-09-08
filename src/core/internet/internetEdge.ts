// src/core/internet/internetEdge.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// The Internet Edge is the outermost security boundary of the BOWCON relay fabric.
// It owns the lifecycle of a single TLS-secured internet connection from initial
// offline state through TLS negotiation, certificate validation, admission, and
// relay binding.
//
// INVARIANT: The Edge is the ONLY entry point to the relay fabric from the internet.
// INVARIANT: The Edge never executes agent tools.
// INVARIANT: The Edge is protocol-neutral — no hardcoded IPs, DNS names, or ports.

import { randomBytes } from 'node:crypto';
import type { InternetEdgeState } from './internetStates.js';
import { isInternetTerminal, isInternetActive } from './internetStates.js';
import { assertValidInternetTransition } from './internetTransitions.js';
import {
  INTERNET_MIN_TLS_VERSION,
  INTERNET_HANDSHAKE_TIMEOUT_MS,
  type InternetEdgeSessionId,
  type InternetEdgeSessionInfo,
  type InternetEdgeSnapshot,
  type InternetTlsVersion,
  type InternetCipherSuite,
  type InternetEndpointDescriptor,
  makeInternetEdgeSessionId,
} from './internetTypes.js';
import { validateTlsSession } from './internetTls.js';
import type { InternetCertDescriptor } from './internetCertificate.js';
import { validateCertificate } from './internetCertificate.js';
import { InternetEdgeError } from './internetFailure.js';
import { appendInternetAuditEvent, type InternetAuditLedger } from './internetAudit.js';

export interface InternetEdgeConfig {
  /** Pin set for certificate pinning. If empty, pinning is skipped. */
  readonly pinSet?: readonly string[];
  /** Allow TLS 1.2 in non-production / test stubs (default: false). */
  readonly allowTls12?: boolean;
  /** Whether to require mTLS (default: true). */
  readonly requireMtls?: boolean;
  /** Handshake timeout override in ms. */
  readonly handshakeTimeoutMs?: number;
}

/**
 * InternetEdge — manages one TLS internet connection lifecycle.
 *
 * State machine: INTERNET_OFFLINE → INTERNET_RESOLVING → INTERNET_CONNECTING
 *   → INTERNET_TLS_HANDSHAKING → INTERNET_CERT_VALIDATING → INTERNET_ADMITTED
 *   → INTERNET_RELAY_BINDING → INTERNET_ACTIVE ↔ INTERNET_DEGRADED / ROAMING
 *   → INTERNET_DRAINING → INTERNET_CLOSED
 *   (any step can → INTERNET_REJECTED on security violation)
 */
export class InternetEdge {
  private _state: InternetEdgeState = 'INTERNET_OFFLINE';
  private _sessionId?: InternetEdgeSessionId;
  private _sessionInfo?: InternetEdgeSessionInfo;
  private _roamingCount = 0;
  private _reconnectCount = 0;
  private _totalTlsRejections = 0;
  private _totalDowngradeAttempts = 0;
  private _establishedAt?: number;
  private _lastActivityAt?: number;
  private readonly _auditLedger: InternetAuditLedger;
  private readonly _config: Required<InternetEdgeConfig>;

  constructor(config: InternetEdgeConfig = {}, auditLedger?: InternetAuditLedger) {
    this._config = {
      pinSet: config.pinSet ?? [],
      allowTls12: config.allowTls12 ?? false,
      requireMtls: config.requireMtls ?? true,
      handshakeTimeoutMs: config.handshakeTimeoutMs ?? INTERNET_HANDSHAKE_TIMEOUT_MS,
    };
    this._auditLedger = auditLedger ?? { events: [] };
  }

  // ---------------------------------------------------------------------------
  // Public state surface (read-only)
  // ---------------------------------------------------------------------------

  get state(): InternetEdgeState { return this._state; }
  get sessionId(): InternetEdgeSessionId | undefined { return this._sessionId; }
  get sessionInfo(): Readonly<InternetEdgeSessionInfo> | undefined { return this._sessionInfo; }
  get isActive(): boolean { return isInternetActive(this._state); }
  get isTerminal(): boolean { return isInternetTerminal(this._state); }

  // ---------------------------------------------------------------------------
  // Lifecycle steps — called by InternetRuntime orchestrator
  // ---------------------------------------------------------------------------

  /** Step 1: Move from OFFLINE to RESOLVING. */
  public beginResolve(endpoint: InternetEndpointDescriptor): void {
    this.transition('INTERNET_RESOLVING', 'beginResolve');
    appendInternetAuditEvent(this._auditLedger, {
      type: 'EDGE_RESOLVE_STARTED',
      sessionId: this._sessionId,
      endpoint: endpoint.host,
      timestamp: Date.now(),
    });
  }

  /** Step 2: Move from RESOLVING to CONNECTING. */
  public beginConnect(): void {
    this.transition('INTERNET_CONNECTING', 'beginConnect');
    appendInternetAuditEvent(this._auditLedger, {
      type: 'EDGE_CONNECT_STARTED',
      sessionId: this._sessionId,
      timestamp: Date.now(),
    });
  }

  /** Step 3: Move to TLS_HANDSHAKING. */
  public beginTlsHandshake(): void {
    this.transition('INTERNET_TLS_HANDSHAKING', 'beginTlsHandshake');
    appendInternetAuditEvent(this._auditLedger, {
      type: 'EDGE_TLS_HANDSHAKE_STARTED',
      sessionId: this._sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Step 4: Validate TLS parameters after handshake completes.
   * On failure → INTERNET_REJECTED (fail-closed).
   */
  public completeTlsHandshake(params: {
    negotiatedVersion: string;
    negotiatedCipher: string;
    isMtls: boolean;
    durationMs: number;
  }): void {
    const result = validateTlsSession(params, {
      requireMtls: this._config.requireMtls,
      allowTls12: this._config.allowTls12,
    });

    if (result.result !== 'TLS_ACCEPTED') {
      if (result.result === 'TLS_REJECTED_VERSION') this._totalDowngradeAttempts++;
      this._totalTlsRejections++;
      this.transition('INTERNET_REJECTED', `TLS rejection: ${result.reason}`);
      appendInternetAuditEvent(this._auditLedger, {
        type: 'EDGE_TLS_REJECTED',
        sessionId: this._sessionId,
        reason: result.reason,
        timestamp: Date.now(),
      });
      throw new InternetEdgeError(
        result.result === 'TLS_REJECTED_VERSION'
          ? 'INTERNET_TLS_VERSION_REJECTED'
          : result.result === 'TLS_REJECTED_CIPHER'
          ? 'INTERNET_TLS_CIPHER_REJECTED'
          : 'INTERNET_TLS_HANDSHAKE_FAILED',
        result.reason ?? 'TLS validation failed.'
      );
    }

    this.transition('INTERNET_CERT_VALIDATING', 'completeTlsHandshake');
    this._sessionId = makeInternetEdgeSessionId(
      `iedge_${Date.now()}_${randomBytes(4).toString('hex')}`
    );
    appendInternetAuditEvent(this._auditLedger, {
      type: 'EDGE_TLS_ACCEPTED',
      sessionId: this._sessionId,
      tlsVersion: result.acceptedVersion,
      cipher: result.acceptedCipher,
      timestamp: Date.now(),
    });

    // Stash accepted session metadata for certificate step
    this._sessionInfo = {
      sessionId: this._sessionId,
      tlsVersion: result.acceptedVersion as InternetTlsVersion,
      cipherSuite: result.acceptedCipher as InternetCipherSuite,
      certFingerprint: '',
      establishedAt: Date.now(),
      lastActivityAt: Date.now(),
      roamingCount: this._roamingCount,
      reconnectCount: this._reconnectCount,
    };
  }

  /**
   * Step 5: Validate the peer certificate.
   * On failure → INTERNET_REJECTED (fail-closed).
   */
  public completeCertValidation(cert: InternetCertDescriptor): void {
    const result = validateCertificate(cert, {
      pinSet: this._config.pinSet.length > 0 ? this._config.pinSet : undefined,
    });

    if (!result.valid) {
      this._totalTlsRejections++;
      this.transition('INTERNET_REJECTED', `Cert rejection: ${result.reason}`);
      appendInternetAuditEvent(this._auditLedger, {
        type: 'EDGE_CERT_REJECTED',
        sessionId: this._sessionId,
        reason: result.reason,
        fingerprint: cert.fingerprint,
        timestamp: Date.now(),
      });
      throw new InternetEdgeError('INTERNET_CERT_CHAIN_INVALID', result.reason ?? 'Certificate invalid.');
    }

    // Patch fingerprint into session info
    if (this._sessionInfo) {
      this._sessionInfo = { ...this._sessionInfo, certFingerprint: cert.fingerprint };
    }

    this.transition('INTERNET_ADMITTED', 'completeCertValidation');
    this._establishedAt = Date.now();
    this._lastActivityAt = Date.now();
    appendInternetAuditEvent(this._auditLedger, {
      type: 'EDGE_CERT_ADMITTED',
      sessionId: this._sessionId,
      fingerprint: cert.fingerprint,
      timestamp: Date.now(),
    });
  }

  /** Step 6: Begin relay binding. */
  public beginRelayBinding(): void {
    this.transition('INTERNET_RELAY_BINDING', 'beginRelayBinding');
  }

  /** Step 7: Mark as fully active. */
  public markActive(): void {
    this.transition('INTERNET_ACTIVE', 'markActive');
    this._lastActivityAt = Date.now();
    appendInternetAuditEvent(this._auditLedger, {
      type: 'EDGE_ACTIVE',
      sessionId: this._sessionId,
      timestamp: Date.now(),
    });
  }

  /** Signal that the connection has degraded (elevated latency / loss). */
  public markDegraded(reason?: string): void {
    if (this._state === 'INTERNET_ACTIVE' || this._state === 'INTERNET_DEGRADED') {
      this.transition('INTERNET_DEGRADED', reason ?? 'markDegraded');
    }
  }

  /** Signal a network roaming event (IP / interface change). */
  public markRoaming(reason?: string): void {
    this._roamingCount++;
    this.transition('INTERNET_ROAMING', reason ?? 'markRoaming');
    if (this._sessionInfo) {
      this._sessionInfo = { ...this._sessionInfo, roamingCount: this._roamingCount };
    }
  }

  /** Begin graceful reconnect attempt. */
  public beginReconnect(): void {
    this._reconnectCount++;
    this.transition('INTERNET_RECONNECTING', 'beginReconnect');
    if (this._sessionInfo) {
      this._sessionInfo = { ...this._sessionInfo, reconnectCount: this._reconnectCount };
    }
  }

  /** Drain and close gracefully. */
  public async drain(): Promise<void> {
    if (!isInternetTerminal(this._state)) {
      this.transition('INTERNET_DRAINING', 'drain');
      await new Promise((r) => setTimeout(r, 0)); // microtask yield
      this.transition('INTERNET_CLOSED', 'drain:complete');
    }
  }

  /** Immediately close (e.g. security violation detected externally). */
  public reject(reason: string): void {
    if (!isInternetTerminal(this._state)) {
      this._totalTlsRejections++;
      this.transition('INTERNET_REJECTED', reason);
      appendInternetAuditEvent(this._auditLedger, {
        type: 'EDGE_REJECTED',
        sessionId: this._sessionId,
        reason,
        timestamp: Date.now(),
      });
    }
  }

  /** Snapshot for AgentLoop observation. */
  public getSnapshot(): InternetEdgeSnapshot {
    return Object.freeze({
      version: '4.0.0',
      activeSessionCount: isInternetActive(this._state) ? 1 : 0,
      totalSessionsEstablished: this._establishedAt ? 1 : 0,
      totalTlsRejections: this._totalTlsRejections,
      totalDowngradeAttempts: this._totalDowngradeAttempts,
      health: this._state === 'INTERNET_ACTIVE'
        ? 'HEALTHY'
        : this._state === 'INTERNET_DEGRADED'
        ? 'DEGRADED'
        : isInternetTerminal(this._state)
        ? 'UNREACHABLE'
        : 'UNKNOWN',
      capturedAt: Date.now(),
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private transition(to: InternetEdgeState, context?: string): void {
    assertValidInternetTransition(this._state, to, context);
    this._state = to;
  }
}
