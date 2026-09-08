// src/core/wire/wireTimeout.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Typed Fail-Closed Wire Timeout Guard.
// Prevents silent hanging across all connection, handshake, admission, and drain operations.

import { WireTransportError } from './wireFailure.js';

export const WIRE_TIMEOUT_CONFIG = Object.freeze({
  CONNECT_TIMEOUT_MS: 5000,
  HANDSHAKE_TIMEOUT_MS: 5000,
  ADMISSION_TIMEOUT_MS: 5000,
  HEARTBEAT_TIMEOUT_MS: 10000,
  RESUME_TIMEOUT_MS: 5000,
  DRAIN_TIMEOUT_MS: 5000,
  IDLE_TIMEOUT_MS: 30000,
});

export async function withWireTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new WireTransportError(
          'WIRE_TIMEOUT',
          `Wire operation "${operationName}" timed out after ${timeoutMs}ms. Aborted fail-closed.`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
