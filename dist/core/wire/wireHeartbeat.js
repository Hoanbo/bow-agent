// src/core/wire/wireHeartbeat.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Real-Time Wire Heartbeat Coordinator & Degradation Tracker.
//
// INVARIANTS:
// - HEARTBEAT != TASK_SUCCESS
// - ACK != TASK_SUCCESS
// - DELIVERED != TASK_SUCCESS
import { createWireFrame } from './wireFrame.js';
export class WireHeartbeatCoordinator {
    degradedMissThreshold;
    unhealthyMissThreshold;
    stats = new Map();
    constructor(degradedMissThreshold = 2, unhealthyMissThreshold = 3) {
        this.degradedMissThreshold = degradedMissThreshold;
        this.unhealthyMissThreshold = unhealthyMissThreshold;
    }
    createHeartbeatFrame(connectionId, sequence) {
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
    createHeartbeatAck(heartbeatFrame, sequence) {
        let pingTimestamp = Date.now();
        let connId = 'unknown';
        try {
            const parsed = JSON.parse(heartbeatFrame.payload);
            pingTimestamp = parsed.timestamp ?? pingTimestamp;
            connId = parsed.connectionId ?? connId;
        }
        catch {
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
    recordPingSent(connectionId) {
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
    recordPongReceived(connectionId, originalPingTimestamp) {
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
    recordMiss(connectionId) {
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
    getStatus(connectionId) {
        const entry = this.stats.get(connectionId);
        if (!entry)
            return 'HEALTHY';
        if (entry.consecutiveMisses >= this.unhealthyMissThreshold) {
            return 'UNHEALTHY';
        }
        if (entry.consecutiveMisses >= this.degradedMissThreshold) {
            return 'DEGRADED';
        }
        return 'HEALTHY';
    }
    getStats(connectionId) {
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
    remove(connectionId) {
        this.stats.delete(connectionId);
    }
}
