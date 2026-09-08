// src/core/internet/internetHealth.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Internet Edge health monitor.
// Periodically probes connection quality (RTT, packet loss) and reports
// health level changes back to the Edge state machine.
//
// INVARIANT: HEALTH != TRUST (Healthy connection does not imply admission).
// INVARIANT: Health probes are read-only observations — they do not grant authority.

import {
  INTERNET_HEALTH_PROBE_INTERVAL_MS,
  INTERNET_HEALTH_DEGRADED_THRESHOLD_MS,
  type InternetHealthLevel,
  type InternetHealthProbe,
} from './internetTypes.js';
import { appendInternetAuditEvent, type InternetAuditLedger } from './internetAudit.js';

export interface InternetHealthPolicy {
  readonly probeIntervalMs: number;
  readonly degradedThresholdMs: number;
  readonly unreachableAfterConsecutiveMisses: number;
}

export const DEFAULT_HEALTH_POLICY: Readonly<InternetHealthPolicy> = Object.freeze({
  probeIntervalMs: INTERNET_HEALTH_PROBE_INTERVAL_MS,
  degradedThresholdMs: INTERNET_HEALTH_DEGRADED_THRESHOLD_MS,
  unreachableAfterConsecutiveMisses: 3,
});

export class InternetHealthMonitor {
  private _level: InternetHealthLevel = 'UNKNOWN';
  private _lastProbe?: InternetHealthProbe;
  private _consecutiveMisses = 0;
  private _probeCount = 0;
  private readonly _policy: Readonly<InternetHealthPolicy>;
  private readonly _ledger: InternetAuditLedger;
  private _probeTimer?: ReturnType<typeof setInterval>;

  constructor(
    policy: Partial<InternetHealthPolicy> = {},
    ledger?: InternetAuditLedger
  ) {
    this._policy = Object.freeze({ ...DEFAULT_HEALTH_POLICY, ...policy });
    this._ledger = ledger ?? { events: [] };
  }

  get level(): InternetHealthLevel { return this._level; }
  get lastProbe(): InternetHealthProbe | undefined { return this._lastProbe; }
  get probeCount(): number { return this._probeCount; }
  get consecutiveMisses(): number { return this._consecutiveMisses; }

  /**
   * Records a synthetic probe result (for testing or manual injection).
   * Production code feeds real RTT measurements from the TLS stack here.
   *
   * INVARIANT: Probe result does NOT change trust or admission state.
   */
  public recordProbe(rttMs: number, reason?: string): InternetHealthProbe {
    this._probeCount++;
    let level: InternetHealthLevel;

    if (rttMs < 0) {
      // Negative RTT = probe failed (timeout or network partition)
      this._consecutiveMisses++;
      level = this._consecutiveMisses >= this._policy.unreachableAfterConsecutiveMisses
        ? 'UNREACHABLE'
        : 'RECOVERING';
    } else {
      this._consecutiveMisses = 0;
      level = rttMs > this._policy.degradedThresholdMs ? 'DEGRADED' : 'HEALTHY';
    }

    const probe: InternetHealthProbe = Object.freeze({
      probedAt: Date.now(),
      rttMs,
      level,
      reason,
    });

    this._level = level;
    this._lastProbe = probe;

    appendInternetAuditEvent(this._ledger, {
      type: 'EDGE_HEALTH_PROBE',
      rttMs,
      level,
      consecutiveMisses: this._consecutiveMisses,
      timestamp: probe.probedAt,
    });

    return probe;
  }

  /**
   * Starts a periodic synthetic probe timer (for integration tests or
   * active-probe enabled configurations).
   * Calls `probeCallback` on each interval; the callback must supply an RTT.
   */
  public startPeriodicProbing(
    probeCallback: () => Promise<number>
  ): void {
    if (this._probeTimer) return; // already running
    this._probeTimer = setInterval(async () => {
      try {
        const rtt = await probeCallback();
        this.recordProbe(rtt);
      } catch {
        this.recordProbe(-1, 'probe_callback_failed');
      }
    }, this._policy.probeIntervalMs);
  }

  /** Stops the periodic probing timer. */
  public stopPeriodicProbing(): void {
    if (this._probeTimer) {
      clearInterval(this._probeTimer);
      this._probeTimer = undefined;
    }
  }

  /** Returns a summary suitable for AgentLoop observation. */
  public getSnapshot(): {
    level: InternetHealthLevel;
    probeCount: number;
    consecutiveMisses: number;
    lastProbe?: InternetHealthProbe;
  } {
    return Object.freeze({
      level: this._level,
      probeCount: this._probeCount,
      consecutiveMisses: this._consecutiveMisses,
      lastProbe: this._lastProbe,
    });
  }
}

/**
 * Pure helper — classifies an RTT into a health level.
 */
export function classifyRtt(
  rttMs: number,
  degradedThresholdMs = INTERNET_HEALTH_DEGRADED_THRESHOLD_MS
): InternetHealthLevel {
  if (rttMs < 0) return 'UNREACHABLE';
  if (rttMs > degradedThresholdMs) return 'DEGRADED';
  return 'HEALTHY';
}
