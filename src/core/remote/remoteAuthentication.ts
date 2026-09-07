// src/core/remote/remoteAuthentication.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE AUTHENTICATION BOUNDARY CONTRACT
//
// EN:
// Pure authentication boundary contract and state evaluation.
// Strictly decoupled from OAuth/OIDC/external identity providers.
// Zero network calls, zero external issuer dependencies.
//
// VI:
// Hợp đồng ranh giới xác thực thuần túy và đánh giá trạng thái.
// Tách biệt hoàn toàn khỏi OAuth/OIDC/nhà cung cấp định danh bên ngoài.
// Không gọi mạng, không phụ thuộc máy chủ cấp phát bên ngoài.

import type { RemoteAuthenticationState } from './remoteStates.js';
import { containsRemoteSecret, deepFreeze } from './remoteValidator.js';
import { fnv1aHex } from './remoteFingerprint.js';

export interface RemoteAuthenticationResult {
  readonly state: RemoteAuthenticationState;
  readonly authenticated: boolean;
  readonly error?: string;
  readonly fingerprint: string;
}

/**
 * EN: Evaluates authentication state purely from token contract parameters.
 * VI: Đánh giá trạng thái xác thực thuần túy từ các tham số hợp đồng token.
 */
export function evaluateRemoteAuthentication(
  token?: string,
): Readonly<RemoteAuthenticationResult> {
  if (!token) {
    const fp = fnv1aHex('AUTH_REQUIRED');
    return deepFreeze({
      state: 'AUTHENTICATION_REQUIRED',
      authenticated: false,
      error: 'Authentication token required.',
      fingerprint: fp,
    });
  }

  const trimmed = token.trim();
  if (trimmed.length === 0) {
    const fp = fnv1aHex('AUTH_INVALID_EMPTY');
    return deepFreeze({
      state: 'AUTHENTICATION_INVALID',
      authenticated: false,
      error: 'Authentication token cannot be empty.',
      fingerprint: fp,
    });
  }

  // Detect raw leaked secrets
  if (containsRemoteSecret(trimmed)) {
    const fp = fnv1aHex('AUTH_REJECTED_SECRET_DETECTED');
    return deepFreeze({
      state: 'AUTHENTICATION_REJECTED',
      authenticated: false,
      error: 'Authentication rejected: raw credentials/secrets detected in token string.',
      fingerprint: fp,
    });
  }

  const fp = fnv1aHex(`AUTHENTICATED::${trimmed.length}`);
  return deepFreeze({
    state: 'AUTHENTICATED',
    authenticated: true,
    fingerprint: fp,
  });
}
