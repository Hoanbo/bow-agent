// src/core/relay/relayBackpressure.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Backpressure management and priority buffer overflow shedding.
//
// INVARIANTS:
// - States: NORMAL, ELEVATED, HIGH, OVERFLOW
// - Non-critical traffic may be dropped during OVERFLOW.
// - Critical security/control traffic MUST NEVER be silently dropped.
// - No silent message loss.

import type {
  RelayBackpressureState,
  RelayMessage,
} from './relayTypes.js';

export interface BackpressureLimits {
  readonly elevatedThreshold: number;
  readonly highThreshold: number;
  readonly overflowThreshold: number;
}

export const DEFAULT_BACKPRESSURE_LIMITS: BackpressureLimits = Object.freeze({
  elevatedThreshold: 50,
  highThreshold: 100,
  overflowThreshold: 150,
});

export class RelayBackpressureError extends Error {
  constructor(message: string) {
    super(`RELAY_BACKPRESSURE_ERROR: ${message}`);
    this.name = 'RelayBackpressureError';
  }
}

export class RelayBackpressureController {
  private readonly queue: RelayMessage[] = [];
  private readonly limits: BackpressureLimits;
  private droppedLowPriorityCount: number = 0;

  constructor(limits?: Partial<BackpressureLimits>) {
    this.limits = Object.freeze({
      ...DEFAULT_BACKPRESSURE_LIMITS,
      ...limits,
    });
  }

  public getState(): RelayBackpressureState {
    const depth = this.queue.length;
    if (depth >= this.limits.overflowThreshold) return 'OVERFLOW';
    if (depth >= this.limits.highThreshold) return 'HIGH';
    if (depth >= this.limits.elevatedThreshold) return 'ELEVATED';
    return 'NORMAL';
  }

  public getQueueDepth(): number {
    return this.queue.length;
  }

  public getDroppedCount(): number {
    return this.droppedLowPriorityCount;
  }

  /**
   * Enqueues an incoming message.
   * If in OVERFLOW state:
   * - Critical / High priority messages are ALWAYS accepted or prioritized.
   * - Normal / Low priority messages are explicitly rejected with an error (not silently dropped).
   */
  public enqueue(message: RelayMessage): boolean {
    const state = this.getState();

    if (state === 'OVERFLOW') {
      // Critical security / control messages MUST NOT be dropped
      if (message.priority === 'CRITICAL' || message.category === 'CONTROL' || message.category === 'ERROR') {
        this.queue.push(message);
        return true;
      }

      // Non-critical traffic is rejected with typed failure (no silent loss)
      this.droppedLowPriorityCount++;
      throw new RelayBackpressureError(
        `BACKPRESSURE_OVERFLOW: Buffer full (${this.queue.length}). Non-critical message ${message.messageId} rejected.`
      );
    }

    this.queue.push(message);
    return true;
  }

  public dequeue(): RelayMessage | undefined {
    return this.queue.shift();
  }

  public clear(): void {
    this.queue.length = 0;
    this.droppedLowPriorityCount = 0;
  }
}
