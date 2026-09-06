// src/core/orchestration/orchestrationFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.11: DETERMINISTIC EXECUTION FINGERPRINT
//
// EN:
// Pure deterministic 32-bit FNV-1a hashing for execution identity.
// Enforces zero randomness (no Math.random) and zero dynamic timestamps (no Date.now)
// in identity calculation to guarantee reproducible, replay-safe fingerprints.
//
// VI:
// Hàm băm FNV-1a 32-bit thuần tất định cho định danh thực thi.
// Tuyệt đối không dùng tính ngẫu nhiên (không Math.random) và không dùng timestamp động (không Date.now)
// trong tính toán định danh để đảm bảo fingerprint có thể tái lập và chống replay.

/**
 * EN: Computes a 32-bit FNV-1a hash formatted as a hex string with a prefix.
 * VI: Tính toán mã băm FNV-1a 32-bit được định dạng chuỗi hex kèm tiền tố.
 */
export function computeDeterministicExecutionFingerprint(
  userId: string,
  sessionId: string,
  actionType: string,
  sourceDecisionFingerprint: string,
  parameters: Readonly<Record<string, unknown>> = {},
): string {
  // Deterministically sort parameter keys to guarantee permutation invariance
  const sortedKeys = Object.keys(parameters).sort();
  const serializedParams = sortedKeys.map(k => `${k}=${JSON.stringify(parameters[k])}`).join('&');

  const rawPayload = [
    userId,
    sessionId,
    actionType,
    sourceDecisionFingerprint,
    serializedParams,
  ].join('::');

  let hash = 2166136261;
  for (let i = 0; i < rawPayload.length; i++) {
    hash = Math.imul(hash ^ rawPayload.charCodeAt(i), 16777619);
  }

  return `exec_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
