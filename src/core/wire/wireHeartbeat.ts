// src/core/wire/wireHeartbeat.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Real-Time Wire Heartbeat Coordinator & Degradation Tracker.
//
// INVARIANTS:
// - HEARTBEAT != TASK_SUCCESS
// - ACK != TASK_SUCCESS
// - DELIVERED != TASK_SUCCESS

import type { WireFrame, WireHeartbeatStatus } from './wireTypes.js';
import { createWireFrame } from './wireFrame.js';

export interface WireHeartbeatStats {
  readonly connectionId: string;
  readonly lastPingSentAt: number;
  readonly lastPongReceivedAt: number;
  readonly consecutiveMisses: number;
  readonly lastRttMs: number;
  readonly averageRttMs: number;
  readonly status: WireHeartbeatStatus;
}

export class WireHeartbeatCoordinator {
  private stats = new Map<string, {
    lastPingSentAt: number;
    lastPongReceivedAt: number;
    consecutiveMisses: number;
    lastRttMs: number;
    totalRttMs: number;
    sampleCount: number;
  }>();

  constructor(
    private readonly degradedMissThreshold = 2,
    private readonly unhealthyMissThreshold = 3
  ) {}

  public createHeartbeatFrame(connectionId: string, sequence: number): WireFrame {
    const payload = JSON.stringify({
      connectionId,
      timestamp: Date.now(),
      type: 'PING',
    });

    const frame = createWireFrame({
      frameType: 'HEARTBEAT',
      sequence,
      payload,
    });

    this.recordPingSent(connectionId);
    return frame;
  }

  public createHeartbeatAck(heartbeatFrame: WireFrame, sequence: number): WireFrame {
    let pingTimestamp = Date.now();
    let connId = 'unknown';
    try {
      const parsed = JSON.parse(heartbeatFrame.payload);
      pingTimestamp = parsed.timestamp ?? pingTimestamp;
      connId = parsed.connectionId ?? connId;
    } catch {
      // Ignored - fallback to defaults
    }

    const payload = JSON.stringify({
      connectionId: connId,
      originalPingTimestamp: pingTimestamp,
      pongTimestamp: Date.now(),
      type: 'PONG',
    });

    return createWireFrame({
      frameType: 'HEARTBEAT_ACK',
      sequence,
      payload,
    });
  }

  public recordPingSent(connectionId: string): void {
    const existing = this.stats.get(connectionId) ?? {
      lastPingSentAt: 0,
      lastPongReceivedAt: 0,
      consecutiveMisses: 0,
      lastRttMs: 0,
      totalRttMs: 0,
      sampleCount: 0,
    };
    existing.lastPingSentAt = Date.now();
    this.stats.set(connectionId, existing);
  }

  public recordPongReceived(connectionId: string, originalPingTimestamp?: number): void {
    const now = Date.now();
    const existing = this.stats.get(connectionId) ?? {
      lastPingSentAt: now,
      lastPongReceivedAt: 0,
      consecutiveMisses: 0,
      lastRttMs: 0,
      totalRttMs: 0,
      sampleCount: 0,
    };

    const pingTime = originalPingTimestamp ?? existing.lastPingSentAt;
    const rtt = Math.max(0, now - pingTime);

    existing.lastPongReceivedAt = now;
    existing.consecutiveMisses = 0;
    existing.lastRttMs = rtt;
    existing.totalRttMs += rtt;
    existing.sampleCount++;

    this.stats.set(connectionId, existing);
  }

  public recordMiss(connectionId: string): void {
    const existing = this.stats.get(connectionId) ?? {
      lastPingSentAt: Date.now(),
      lastPongReceivedAt: 0,
      consecutiveMisses: 0,
      lastRttMs: 0,
      totalRttMs: 0,
      sampleCount: 0,
    };
    existing.consecutiveMisses++;
    this.stats.set(connectionId, existing);
  }

  public getStatus(connectionId: string): WireHeartbeatStatus {
    const entry = this.stats.get(connectionId);
    if (!entry) return 'HEALTHY';

    if (entry.consecutiveMisses >= this.unhealthyMissThreshold) {
      return 'UNHEALTHY';
    }
    if (entry.consecutiveMisses >= this.degradedMissThreshold) {
      return 'DEGRADED';
    }
    return 'HEALTHY';
  }

  public getStats(connectionId: string): WireHeartbeatStats {
    const entry = this.stats.get(connectionId) ?? {
      lastPingSentAt: 0,
      lastPongReceivedAt: 0,
      consecutiveMisses: 0,
      lastRttMs: 0,
      totalRttMs: 0,
      sampleCount: 0,
    };

    const avgRtt = entry.sampleCount > 0 ? Math.round(entry.totalRttMs / entry.sampleCount) : 0;

    return Object.freeze({
      connectionId,
      lastPingSentAt: entry.lastPingSentAt,
      lastPongReceivedAt: entry.lastPongReceivedAt,
      consecutiveMisses: entry.consecutiveMisses,
      lastRttMs: entry.lastRttMs,
      averageRttMs: avgRtt,
      status: this.getStatus(connectionId),
    });
  }

  public remove(connectionId: string): void {
    this.stats.delete(connectionId);
  }
}
