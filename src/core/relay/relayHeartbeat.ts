// src/core/relay/relayHeartbeat.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Heartbeat coordination, degradation detection, and health tracking.
//
// INVARIANTS:
// - HEARTBEAT != TASK_SUCCESS
// - Heartbeat failure MUST NOT automatically execute any task.
// - Heartbeat failure MUST NOT mutate Brain cognitive state.
// - Heartbeat recovery MUST NOT automatically replay commands.

import type {
  RelayId,
  RelayHeartbeatRecord,
  RelayHeartbeatStatus,
} from './relayTypes.js';

export interface HeartbeatConfig {
  readonly intervalMs: number;
  readonly degradedMissThreshold: number;
  readonly unhealthyMissThreshold: number;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = Object.freeze({
  intervalMs: 5000,
  degradedMissThreshold: 2,
  unhealthyMissThreshold: 4,
});

export class RelayHeartbeatError extends Error {
  constructor(message: string) {
    super(`RELAY_HEARTBEAT_ERROR: ${message}`);
    this.name = 'RelayHeartbeatError';
  }
}

export class RelayHeartbeatTracker {
  private readonly records = new Map<string, RelayHeartbeatRecord>();
  private readonly config: HeartbeatConfig;

  constructor(config?: Partial<HeartbeatConfig>) {
    this.config = Object.freeze({
      ...DEFAULT_HEARTBEAT_CONFIG,
      ...config,
    });
  }

  /**
   * Records a successful heartbeat exchange with round-trip time.
   */
  public recordHeartbeat(
    relayId: RelayId,
    sessionId: string,
    rttMs: number,
    now: number = Date.now()
  ): RelayHeartbeatRecord {
    const record: RelayHeartbeatRecord = {
      relayId,
      sessionId,
      timestamp: now,
      rttMs: Math.max(0, rttMs),
      status: 'HEALTHY',
      consecutiveMisses: 0,
    };
    this.records.set(sessionId, Object.freeze(record));
    return record;
  }

  /**
   * Records a missed heartbeat ping/pong interval.
   */
  public recordMissedHeartbeat(sessionId: string, now: number = Date.now()): RelayHeartbeatRecord {
    const existing = this.records.get(sessionId);
    const misses = (existing?.consecutiveMisses ?? 0) + 1;

    let status: RelayHeartbeatStatus = 'HEALTHY';
    if (misses >= this.config.unhealthyMissThreshold) {
      status = 'UNHEALTHY';
    } else if (misses >= this.config.degradedMissThreshold) {
      status = 'DEGRADED';
    }

    const record: RelayHeartbeatRecord = {
      relayId: existing?.relayId ?? 'relay_unknown',
      sessionId,
      timestamp: now,
      rttMs: existing?.rttMs ?? -1,
      status,
      consecutiveMisses: misses,
    };
    this.records.set(sessionId, Object.freeze(record));
    return record;
  }

  public getStatus(sessionId: string): RelayHeartbeatStatus {
    return this.records.get(sessionId)?.status ?? 'UNHEALTHY';
  }

  public getRecord(sessionId: string): RelayHeartbeatRecord | undefined {
    return this.records.get(sessionId);
  }

  public clear(): void {
    this.records.clear();
  }

  /**
   * Invariant verification: Heartbeat status changes never trigger cognitive task execution.
   */
  public static assertHeartbeatNonInterference(taskExecutionAttempted: boolean): void {
    if (taskExecutionAttempted) {
      throw new RelayHeartbeatError(
        'INVARIANT_VIOLATION: Heartbeat event must NEVER trigger task execution.'
      );
    }
  }
}
