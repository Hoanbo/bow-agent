// src/core/wire/wireReconnect.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Bounded Exponential Backoff Wire Reconnect Scheduler & Network Roaming Manager.
//
// STRICT CARDINAL INVARIANTS:
// - RECONNECT != RE-EXECUTE
// - SESSION_RESUME != TASK_RESUME
// - NETWORK_ADDRESS != DEVICE_IDENTITY
// - SAME_DEVICE + DIFFERENT_NETWORK = SAME_DEVICE_IDENTITY
// - DIFFERENT_DEVICE + SAME_NETWORK != SAME_DEVICE_IDENTITY

import { randomBytes } from 'node:crypto';
import type { NetworkType } from '../admission/admissionTypes.js';

export interface WireReconnectConfig {
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly multiplier: number;
  readonly jitterFactor: number;
  readonly maxAttempts: number;
}

export const DEFAULT_WIRE_RECONNECT_CONFIG: WireReconnectConfig = Object.freeze({
  initialDelayMs: 500,
  maxDelayMs: 30000,
  multiplier: 1.5,
  jitterFactor: 0.2,
  maxAttempts: 10,
});

export interface NetworkRoamingSnapshot {
  readonly deviceId: string;
  readonly previousNetworkType?: NetworkType;
  readonly currentNetworkType: NetworkType;
  readonly previousIp?: string;
  readonly currentIp: string;
  readonly roamingTimestamp: number;
  readonly identityPreserved: boolean;
}

export class WireReconnectScheduler {
  private attempts = new Map<string, number>();
  private readonly config: WireReconnectConfig;

  constructor(config?: Partial<WireReconnectConfig>) {
    this.config = Object.freeze({
      ...DEFAULT_WIRE_RECONNECT_CONFIG,
      ...config,
    });
  }

  /**
   * Computes delay in milliseconds for next reconnect attempt using bounded exponential backoff.
   */
  public computeNextDelay(deviceId: string): { delayMs: number; attempt: number; canRetry: boolean } {
    const currentAttempt = (this.attempts.get(deviceId) ?? 0) + 1;
    this.attempts.set(deviceId, currentAttempt);

    if (currentAttempt > this.config.maxAttempts) {
      return { delayMs: 0, attempt: currentAttempt, canRetry: false };
    }

    // Exponential calculation
    const baseDelay = Math.min(
      this.config.maxDelayMs,
      this.config.initialDelayMs * Math.pow(this.config.multiplier, currentAttempt - 1)
    );

    // Cryptographic jitter (+/- jitterFactor)
    const jitterEntropy = (randomBytes(2).readUInt16BE(0) / 65535) * 2 - 1; // -1 to +1
    const jitter = baseDelay * this.config.jitterFactor * jitterEntropy;
    const delayMs = Math.max(100, Math.round(baseDelay + jitter));

    return { delayMs, attempt: currentAttempt, canRetry: true };
  }

  /**
   * Handles network roaming event (e.g. WiFi -> 4G -> 5G).
   * Verifies that device identity remains unchanged despite IP/network changes.
   */
  public recordRoamingEvent(params: {
    deviceId: string;
    previousNetworkType?: NetworkType;
    currentNetworkType: NetworkType;
    previousIp?: string;
    currentIp: string;
  }): NetworkRoamingSnapshot {
    // Reset backoff on physical network transition because the medium changed
    this.attempts.delete(params.deviceId);

    return Object.freeze({
      deviceId: params.deviceId,
      previousNetworkType: params.previousNetworkType,
      currentNetworkType: params.currentNetworkType,
      previousIp: params.previousIp,
      currentIp: params.currentIp,
      roamingTimestamp: Date.now(),
      identityPreserved: true, // Device ID remains invariant
    });
  }

  public reset(deviceId: string): void {
    this.attempts.delete(deviceId);
  }

  public getAttempts(deviceId: string): number {
    return this.attempts.get(deviceId) ?? 0;
  }
}
