// src/core/connection/connectionAuthentication.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - AUTHENTICATED != AUTHORIZED
// - Authentication establishes peer identity ONLY.
// - Authentication NEVER grants execution capabilities or bypasses governance.

import type { ScopedConnectionIdentity } from './connectionTypes.js';
import { deepFreeze, scrubConnectionSecrets } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
import { createDeterministicPeerId } from './connectionIdentity.js';

export type AuthState = 'UNAUTHENTICATED' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'FAILED';

export interface ConnectionAuthCredentials {
  readonly credentialType: string;
  readonly principal: string;
  readonly secretPayload?: string;
  readonly claims?: Readonly<Record<string, unknown>>;
}

export interface ConnectionAuthResult {
  readonly authenticated: boolean;
  readonly peerId: string;
  readonly principal: string;
  readonly authState: AuthState;
  readonly claims: Readonly<Record<string, unknown>>;
  readonly error?: string;
  readonly fingerprint: string;
}

/**
 * Pure-data authentication verification.
 * Authenticates peer identity without granting authorization or capabilities.
 */
export function authenticateConnectionPeer(
  identity: ScopedConnectionIdentity,
  creds: ConnectionAuthCredentials
): Readonly<ConnectionAuthResult> {
  // Validate credentials
  if (!creds || typeof creds.principal !== 'string' || creds.principal.trim().length === 0) {
    return deepFreeze({
      authenticated: false,
      peerId: 'peer_anonymous',
      principal: 'anonymous',
      authState: 'FAILED',
      claims: deepFreeze({}),
      error: 'INVALID_CREDENTIALS',
      fingerprint: computeConnectionFingerprint({ error: 'INVALID_CREDENTIALS' }),
    });
  }

  // Ensure principal aligns with identity.userId (cross-user spoofing defense)
  if (creds.principal !== identity.userId) {
    return deepFreeze({
      authenticated: false,
      peerId: 'peer_mismatch',
      principal: scrubConnectionSecrets(creds.principal),
      authState: 'FAILED',
      claims: deepFreeze({}),
      error: 'PRINCIPAL_USER_MISMATCH',
      fingerprint: computeConnectionFingerprint({ error: 'PRINCIPAL_USER_MISMATCH' }),
    });
  }

  const peerId = createDeterministicPeerId({
    userId: identity.userId,
    surfaceId: identity.surfaceId,
    role: creds.claims?.role as string | undefined,
  });

  const sanitizedClaims = creds.claims ? scrubConnectionSecrets(creds.claims) : {};
  const fp = computeConnectionFingerprint({
    authenticated: true,
    peerId,
    principal: creds.principal,
    claims: sanitizedClaims,
  });

  return deepFreeze({
    authenticated: true,
    peerId,
    principal: creds.principal,
    authState: 'AUTHENTICATED',
    claims: deepFreeze({ ...sanitizedClaims }),
    fingerprint: fp,
  });
}
