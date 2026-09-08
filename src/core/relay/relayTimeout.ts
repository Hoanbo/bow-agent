// src/core/relay/relayTimeout.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Typed timeout management eliminating silent hangs across relay operations.
//
// INVARIANTS:
// - All timeouts produce typed failures.
// - No silent hangs.

import type { RelayTimeoutCategory } from './relayTypes.js';

export class RelayTimeoutError extends Error {
  constructor(
    public readonly category: RelayTimeoutCategory,
    public readonly timeoutMs: number,
    public readonly operationName: string
  ) {
    super(
      `RELAY_TIMEOUT [${category}]: Operation '${operationName}' timed out after ${timeoutMs}ms.`
    );
    this.name = 'RelayTimeoutError';
  }
}

export const RELAY_TIMEOUT_DEFAULTS: Readonly<Record<RelayTimeoutCategory, number>> = Object.freeze({
  CONNECTION: 10000,
  REGISTRATION: 5000,
  ADMISSION: 8000,
  SESSION_ESTABLISHMENT: 5000,
  HEARTBEAT: 3000,
  RECONNECT: 15000,
  RESUME: 5000,
  ROUTING: 3000,
  SHUTDOWN: 5000,
});

export function getRelayDefaultTimeout(category: RelayTimeoutCategory): number {
  return RELAY_TIMEOUT_DEFAULTS[category] ?? 5000;
}

/**
 * Wraps a promise with a fail-closed typed timeout.
 */
export async function withRelayTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  category: RelayTimeoutCategory,
  operationName: string
): Promise<T> {
  let timerId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new RelayTimeoutError(category, timeoutMs, operationName));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}
