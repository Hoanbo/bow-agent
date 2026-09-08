// src/core/internet/internetRoaming.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Network roaming handler — detects and responds to interface / IP changes.
//
// INVARIANT: Roaming does NOT change device identity (ROAMING != IDENTITY_CHANGE).
// INVARIANT: Roaming does NOT trigger task re-execution (RECONNECT != RE-EXECUTE).
// INVARIANT: All roaming events are emitted to the audit ledger.

import type { InternetRoamingReason, InternetNetworkInterface } from './internetTypes.js';
import { appendInternetAuditEvent, type InternetAuditLedger } from './internetAudit.js';
import { InternetEdgeError } from './internetFailure.js';

export interface InternetRoamingEvent {
  readonly reason: InternetRoamingReason;
  readonly previousInterface?: InternetNetworkInterface;
  readonly newInterface?: InternetNetworkInterface;
  readonly detectedAt: number;
  /** Sequence number, monotonically increasing per Edge session. */
  readonly sequence: number;
}

export interface InternetRoamingPolicy {
  /** Maximum number of consecutive roaming events before the edge is shut down. */
  readonly maxRoamingEvents: number;
  /** Minimum milliseconds between two roaming events (debounce). */
  readonly debounceMs: number;
}

export const DEFAULT_ROAMING_POLICY: Readonly<InternetRoamingPolicy> = Object.freeze({
  maxRoamingEvents: 10,
  debounceMs: 500,
});

export class InternetRoamingTracker {
  private _sequence = 0;
  private _lastRoamAt = 0;
  private readonly _events: InternetRoamingEvent[] = [];
  private readonly _policy: Readonly<InternetRoamingPolicy>;
  private readonly _ledger: InternetAuditLedger;

  constructor(
    policy: Partial<InternetRoamingPolicy> = {},
    ledger?: InternetAuditLedger
  ) {
    this._policy = Object.freeze({ ...DEFAULT_ROAMING_POLICY, ...policy });
    this._ledger = ledger ?? { events: [] };
  }

  /** Number of roaming events recorded. */
  get roamingCount(): number { return this._sequence; }

  /** All recorded roaming events (read-only). */
  get events(): readonly InternetRoamingEvent[] { return this._events; }

  /**
   * Records a roaming event.
   * Throws InternetEdgeError if debounce window has not passed or if
   * the max roaming event limit has been reached.
   *
   * INVARIANT: Does not reset device identity.
   * INVARIANT: Does not trigger task re-execution.
   */
  public recordRoaming(
    reason: InternetRoamingReason,
    opts: {
      previousInterface?: InternetNetworkInterface;
      newInterface?: InternetNetworkInterface;
    } = {}
  ): InternetRoamingEvent {
    const now = Date.now();

    if (now - this._lastRoamAt < this._policy.debounceMs) {
      throw new InternetEdgeError(
        'INTERNET_ROAMING_FAILED',
        `Roaming event debounced: ${now - this._lastRoamAt}ms < ${this._policy.debounceMs}ms debounce window.`
      );
    }

    if (this._sequence >= this._policy.maxRoamingEvents) {
      throw new InternetEdgeError(
        'INTERNET_ROAMING_FAILED',
        `Maximum roaming events (${this._policy.maxRoamingEvents}) exceeded. Edge must reconnect from scratch.`
      );
    }

    this._sequence++;
    this._lastRoamAt = now;

    const event: InternetRoamingEvent = Object.freeze({
      reason,
      previousInterface: opts.previousInterface,
      newInterface: opts.newInterface,
      detectedAt: now,
      sequence: this._sequence,
    });

    this._events.push(event);
    appendInternetAuditEvent(this._ledger, {
      type: 'EDGE_ROAMING',
      reason,
      sequence: this._sequence,
      timestamp: now,
    });

    return event;
  }

  /**
   * Resets the roaming tracker for a new Edge session lifecycle.
   * Does NOT reset device identity.
   */
  public reset(): void {
    this._sequence = 0;
    this._lastRoamAt = 0;
    this._events.length = 0;
  }
}

/**
 * Pure function — determines whether two network interfaces represent a roaming event.
 */
export function detectRoamingTransition(
  previous: InternetNetworkInterface | undefined,
  current: InternetNetworkInterface | undefined
): InternetRoamingReason | undefined {
  if (!previous || !current) return undefined;
  if (previous.label !== current.label) return 'INTERFACE_CHANGE';
  return undefined;
}
