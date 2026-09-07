// src/core/connection/connectionFailure.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Typed immutable failure descriptors with automatic secret scrubbing.

import type { ScopedConnectionIdentity, ConnectionFailureCode } from './connectionTypes.js';
import { createConnectionScope, deepFreeze, scrubConnectionSecrets } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';

export interface ConnectionFailureDescriptor {
  readonly failureId: string;
  readonly scope: string;
  readonly scopeIdentity: ScopedConnectionIdentity;
  readonly code: ConnectionFailureCode;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
  readonly fingerprint: string;
}

/**
 * Creates an immutable, scrubbed ConnectionFailureDescriptor
 */
export function createConnectionFailureDescriptor(
  identity: ScopedConnectionIdentity,
  code: ConnectionFailureCode,
  rawMessage: string,
  rawDetails: Record<string, unknown> = {},
  timestamp = new Date().toISOString()
): Readonly<ConnectionFailureDescriptor> {
  const scope = createConnectionScope(identity);
  const scrubbedMsg = scrubConnectionSecrets(rawMessage);
  const scrubbedDetails = scrubConnectionSecrets(rawDetails);

  const fp = computeConnectionFingerprint({
    scope,
    code,
    message: scrubbedMsg,
    details: scrubbedDetails,
  });

  return deepFreeze({
    failureId: `cfail_${fp}`,
    scope,
    scopeIdentity: deepFreeze({ ...identity }),
    code,
    message: scrubbedMsg,
    details: deepFreeze({ ...scrubbedDetails }),
    timestamp,
    fingerprint: fp,
  });
}
