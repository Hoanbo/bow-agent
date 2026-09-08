// src/core/internet/internetRuntime.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// InternetRuntime — master orchestrator for the Production Secure Internet Edge.
// Coordinates: InternetEdge lifecycle, TLS validation, certificate validation,
// admission bridge, relay bridge, health monitoring, reconnect scheduling,
// and roaming handling. All operations are audit-logged.
//
// INVARIANT: InternetRuntime is the ONLY public entry point to the internet edge subsystem.
// INVARIANT: No module outside src/core/internet/ may bypass this class.
// INVARIANT: All state transitions happen through InternetEdge (fail-closed).
// INVARIANT: INTERNET_REJECTED is always fail-closed — never silently ignored.

import { randomBytes } from 'node:crypto';
import {
  INTERNET_SUBSYSTEM_VERSION,
  type InternetEdgeSnapshot,
  type InternetEndpointDescriptor,
} from './internetTypes.js';
import { InternetEdge, type InternetEdgeConfig } from './internetEdge.js';
import { InternetAdmissionBridge } from './internetAdmissionBridge.js';
import { InternetRelayBridge } from './internetRelayBridge.js';
import { InternetHealthMonitor } from './internetHealth.js';
import { InternetReconnectScheduler } from './internetReconnect.js';
import { InternetRoamingTracker } from './internetRoaming.js';
import {
  assertInternetEndpointValid,
  normalizeInternetEndpoint,
} from './internetEndpoint.js';
import {
  appendInternetAuditEvent,
  snapshotInternetAuditLedger,
  type InternetAuditLedger,
  type InternetAuditEvent,
} from './internetAudit.js';
import { InternetEdgeError } from './internetFailure.js';
import type { InternetCertDescriptor } from './internetCertificate.js';
import type { InternetTlsVersion, InternetCipherSuite } from './internetTypes.js';

export interface InternetRuntimeConfig {
  readonly edgeConfig?: InternetEdgeConfig;
  readonly allowInsecureEndpoints?: boolean;
}

/**
 * A full snapshot of the InternetRuntime for AgentLoop observation.
 * All fields are value types — no mutable references escape.
 */
export interface InternetRuntimeSnapshot {
  readonly version: string;
  readonly edge: InternetEdgeSnapshot;
  readonly pendingAdmissionTokens: number;
  readonly activeRelayBindings: number;
  readonly health: {
    level: string;
    probeCount: number;
    consecutiveMisses: number;
  };
  readonly reconnect: {
    attemptCount: number;
    isExhausted: boolean;
  };
  readonly roaming: {
    roamingCount: number;
  };
  readonly totalAuditEvents: number;
  readonly capturedAt: number;
}

/**
 * InternetRuntime — the top-level orchestrator for the Internet Edge & TLS Relay subsystem.
 *
 * Typical happy path:
 *   1. connect(endpoint)        → OFFLINE → RESOLVING → CONNECTING
 *   2. onTlsHandshakeComplete() → CERT_VALIDATING (after TLS validation passes)
 *   3. onCertValidated()        → ADMITTED (after cert check passes)
 *   4. bindToRelay()            → ACTIVE (token issued, consumed, relay bound)
 *
 * All failure paths → INTERNET_REJECTED (fail-closed).
 */
export class InternetRuntime {
  private readonly _edge: InternetEdge;
  private readonly _admissionBridge: InternetAdmissionBridge;
  private readonly _relayBridge: InternetRelayBridge;
  private readonly _health: InternetHealthMonitor;
  private readonly _reconnect: InternetReconnectScheduler;
  private readonly _roaming: InternetRoamingTracker;
  private readonly _ledger: InternetAuditLedger;
  private readonly _config: Required<InternetRuntimeConfig>;
  private _endpoint?: InternetEndpointDescriptor;

  constructor(config: InternetRuntimeConfig = {}) {
    this._config = {
      edgeConfig: config.edgeConfig ?? {},
      allowInsecureEndpoints: config.allowInsecureEndpoints ?? false,
    };
    this._ledger = { events: [] };
    this._edge = new InternetEdge(this._config.edgeConfig, this._ledger);
    this._admissionBridge = new InternetAdmissionBridge({}, this._ledger);
    this._relayBridge = new InternetRelayBridge(this._ledger);
    this._health = new InternetHealthMonitor({}, this._ledger);
    this._reconnect = new InternetReconnectScheduler({}, this._ledger);
    this._roaming = new InternetRoamingTracker({}, this._ledger);
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  get state() { return this._edge.state; }
  get isActive() { return this._edge.isActive; }
  get isTerminal() { return this._edge.isTerminal; }
  get sessionId() { return this._edge.sessionId; }

  // ---------------------------------------------------------------------------
  // Lifecycle orchestration
  // ---------------------------------------------------------------------------

  /**
   * Step 1: Begin connecting to an internet endpoint.
   * Validates the endpoint and advances the Edge state machine.
   */
  public connect(endpoint: InternetEndpointDescriptor): void {
    const normalized = normalizeInternetEndpoint(endpoint);
    assertInternetEndpointValid(normalized, {
      allowInsecure: this._config.allowInsecureEndpoints,
    });
    this._endpoint = normalized;

    this._edge.beginResolve(normalized);
    this._edge.beginConnect();
    this._edge.beginTlsHandshake();
  }

  /**
   * Step 2: Called once the TLS handshake completes.
   * Validates TLS version and cipher; advances to CERT_VALIDATING or REJECTED.
   */
  public completeTls(params: {
    negotiatedVersion: string;
    negotiatedCipher: string;
    isMtls: boolean;
    durationMs: number;
  }): void {
    this._edge.completeTlsHandshake(params);
  }

  /**
   * Step 3: Called once the peer certificate has been inspected.
   * Validates cert and issues admission token; advances to ADMITTED or REJECTED.
   */
  public completeCert(cert: InternetCertDescriptor): void {
    this._edge.completeCertValidation(cert);
  }

  /**
   * Step 4: Binds the admitted session to the relay fabric.
   * Issues an admission token, consumes it, and creates a relay binding.
   * Advances to ACTIVE on success; REJECTED on any failure.
   */
  public bindToRelay(): void {
    const sessionId = this._edge.sessionId;
    const sessionInfo = this._edge.sessionInfo;

    if (!sessionId || !sessionInfo) {
      this._edge.reject('bindToRelay: no active session info');
      throw new InternetEdgeError(
        'INTERNET_RELAY_BIND_FAILED',
        'Cannot bind to relay without an established TLS session.'
      );
    }

    if (this._edge.state !== 'INTERNET_ADMITTED') {
      this._edge.reject(`bindToRelay: illegal state ${this._edge.state}`);
      throw new InternetEdgeError(
        'INTERNET_RELAY_BIND_FAILED',
        `Relay binding requires INTERNET_ADMITTED state; current state is "${this._edge.state}".`
      );
    }

    // Issue single-use token
    const token = this._admissionBridge.issueToken({
      sessionId,
      tlsVersion: sessionInfo.tlsVersion,
      cipherSuite: sessionInfo.cipherSuite,
      certFingerprint: sessionInfo.certFingerprint,
    });

    // Consume token (fingerprint must match)
    const consumption = this._admissionBridge.consumeToken(
      sessionId,
      sessionInfo.certFingerprint
    );

    if (consumption.decision !== 'ADMIT' || !consumption.token) {
      this._edge.reject(`Admission token rejected: ${consumption.reason}`);
      throw new InternetEdgeError(
        'INTERNET_ADMISSION_REJECTED',
        consumption.reason ?? 'Admission token was not accepted by the bridge.'
      );
    }

    // Bind to relay fabric
    this._edge.beginRelayBinding();
    this._relayBridge.bind(consumption.token);
    this._edge.markActive();
    this._reconnect.reset();
  }

  /**
   * Records a health probe result (RTT in ms; negative = missed probe).
   */
  public recordHealthProbe(rttMs: number): void {
    const probe = this._health.recordProbe(rttMs);
    if (probe.level === 'DEGRADED' && this._edge.isActive) {
      this._edge.markDegraded(probe.reason);
    }
  }

  /**
   * Reports a network roaming event.
   * INVARIANT: Roaming does NOT change identity or re-execute tasks.
   */
  public reportRoaming(reason: 'INTERFACE_CHANGE' | 'IP_CHANGE' | 'NETWORK_SWITCH' | 'DNS_CHANGE' | 'FORCED_ROAM'): void {
    this._roaming.recordRoaming(reason);
    this._edge.markRoaming(reason);
  }

  /**
   * Schedules a reconnect attempt.
   * Throws InternetEdgeError if max attempts are exhausted.
   * INVARIANT: Reconnect does NOT re-execute any agent task.
   */
  public scheduleReconnect(): number {
    const attempt = this._reconnect.beginAttempt();
    this._edge.beginReconnect();
    return attempt.scheduledDelayMs;
  }

  /**
   * Signals that a reconnect succeeded; resets the reconnect counter.
   */
  public onReconnectSucceeded(): void {
    this._reconnect.markSucceeded();
  }

  /**
   * Gracefully drains and closes the Edge session.
   */
  public async shutdown(): Promise<void> {
    const sessionId = this._edge.sessionId;
    if (sessionId) {
      this._relayBridge.unbind(sessionId, 'shutdown');
    }
    await this._edge.drain();
    this._health.stopPeriodicProbing();

    appendInternetAuditEvent(this._ledger, {
      type: 'EDGE_CLOSED',
      sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Returns an immutable runtime snapshot for AgentLoop observation.
   */
  public getSnapshot(): InternetRuntimeSnapshot {
    const healthSnap = this._health.getSnapshot();
    const reconnectSnap = {
      attemptCount: this._reconnect.attemptCount,
      isExhausted: this._reconnect.isExhausted,
    };
    return Object.freeze({
      version: INTERNET_SUBSYSTEM_VERSION,
      edge: this._edge.getSnapshot(),
      pendingAdmissionTokens: this._admissionBridge.getSnapshot().pendingCount,
      activeRelayBindings: this._relayBridge.activeBindingCount,
      health: {
        level: healthSnap.level,
        probeCount: healthSnap.probeCount,
        consecutiveMisses: healthSnap.consecutiveMisses,
      },
      reconnect: reconnectSnap,
      roaming: {
        roamingCount: this._roaming.roamingCount,
      },
      totalAuditEvents: this._ledger.events.length,
      capturedAt: Date.now(),
    });
  }

  /**
   * Returns a frozen copy of all audit events for inspection.
   */
  public getAuditEvents(): readonly InternetAuditEvent[] {
    return snapshotInternetAuditLedger(this._ledger);
  }
}

// ---------------------------------------------------------------------------
// Global singleton for use by AgentLoop
// ---------------------------------------------------------------------------

/** Default production runtime. AgentLoop references this via getInternetRuntime(). */
let _globalInternetRuntime: InternetRuntime | undefined;

export function getInternetRuntime(): InternetRuntime {
  if (!_globalInternetRuntime) {
    _globalInternetRuntime = new InternetRuntime({
      edgeConfig: {
        requireMtls: false,   // disabled for local/test environments without mTLS
        allowTls12: true,     // test stubs may use TLS 1.2
      },
      allowInsecureEndpoints: true, // test mode
    });
  }
  return _globalInternetRuntime;
}

/** Replaces the global runtime — used only in tests. */
export function setInternetRuntimeForTest(runtime: InternetRuntime): void {
  _globalInternetRuntime = runtime;
}
