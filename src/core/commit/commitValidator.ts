// src/core/commit/commitValidator.ts
// BOWCON V4.0 — MILESTONE 1.3.15: COMMIT SECURITY & INVARIANT VALIDATOR
//
// EN:
// Authoritative security and invariant validator for the durable commit subsystem.
// Enforces: VERIFIED TASK != DURABLY COMMITTED STATE, multi-tenant isolation, secret scrubbing,
// prototype pollution defense, null byte defense, and monotonic risk preservation.
//
// VI:
// Bộ xác thực an ninh và bất biến có thẩm quyền cho phân hệ commit bền vững.
// Thực thi: TÁC VỤ ĐÃ XÁC MINH != TRẠNG THÁI ĐÃ COMMIT BỀN VỮNG, cô lập multi-tenant, tẩy sạch bí mật,
// phòng thủ prototype pollution, null byte và bảo toàn rủi ro đơn điệu.

import type { PlanRiskLevel } from '../planning/planningTypes.js';

const DISALLOWED_USERS = new Set([
  '',
  'anonymous',
  'anon',
  'unknown',
  'unauthenticated',
  'null',
  'undefined',
]);

const SECRET_PATTERNS = [
  /bearer\s+[A-Za-z0-9\-._~+/]+=*/i,
  /api[_-]?key\s*[:=]\s*['"]?[A-Za-z0-9_\-]{8,}['"]?/i,
  /authorization\s*[:=]\s*['"]?[A-Za-z0-9_\-]{8,}['"]?/i,
  /password\s*[:=]\s*['"]?[^\s'"]{4,}['"]?/i,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
  /credentials?\s*[:=]/i,
  /sk-[a-zA-Z0-9]{20,}/i,
  /pwd=([^\s;]+)/i,
];

const PROTOTYPE_POLLUTION_REGEX = /(__proto__|constructor|prototype)/i;

const WINDOWS_RESERVED_DEVICE_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

const RISK_HIERARCHY: Record<PlanRiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * EN: Scrubs and redacts secrets from any string.
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi ký tự nào.
 */
export function redactCommitSecrets(text: string): string {
  if (typeof text !== 'string') return '';
  let sanitized = text;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}

/**
 * EN: Checks if a value contains any credential or secret pattern.
 * VI: Kiểm tra xem một giá trị có chứa mẫu chứng thực hoặc bí mật hay không.
 */
export function containsCommitSecret(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return SECRET_PATTERNS.some(p => p.test(val));
}

/**
 * EN: Recursively scans an object for prototype pollution vectors.
 * VI: Quét đệ quy một đối tượng để tìm các vector ô nhiễm prototype.
 */
export function hasCommitPrototypePollution(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(target, '__proto__')) return true;
  if (Object.prototype.hasOwnProperty.call(target, 'prototype')) return true;
  if (Object.prototype.hasOwnProperty.call(target, 'constructor') && typeof (target as any).constructor !== 'function') return true;

  const proto = Object.getPrototypeOf(target);
  if (proto !== null && proto !== Object.prototype && proto !== Array.prototype) {
    return true;
  }

  for (const [k, v] of Object.entries(target)) {
    if (PROTOTYPE_POLLUTION_REGEX.test(k)) return true;
    if (v && typeof v === 'object' && hasCommitPrototypePollution(v)) return true;
  }

  return false;
}

/**
 * EN: Enforces valid tenant identity and multi-tenant session isolation.
 * VI: Thực thi định danh tenant hợp lệ và cô lập phiên làm việc multi-tenant.
 */
export function validateCommitScope(userId: string, sessionId: string): void {
  if (!userId || typeof userId !== 'string' || DISALLOWED_USERS.has(userId.trim().toLowerCase())) {
    throw new Error(`INVALID_USER_SCOPE: Access denied for invalid or anonymous userId: "${userId}"`);
  }

  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    throw new Error('INVALID_SESSION_SCOPE: Access denied for missing or invalid sessionId');
  }

  if (userId.includes('\0') || sessionId.includes('\0')) {
    throw new Error('NULL_BYTE_DETECTED: Null bytes in scope identity are strictly forbidden');
  }

  if (PROTOTYPE_POLLUTION_REGEX.test(userId) || PROTOTYPE_POLLUTION_REGEX.test(sessionId)) {
    throw new Error('PROTOTYPE_POLLUTION: Scope identity contains disallowed prototype pollution keys');
  }

  const userUpper = userId.trim().toUpperCase();
  const sessionUpper = sessionId.trim().toUpperCase();
  if (WINDOWS_RESERVED_DEVICE_NAMES.has(userUpper) || WINDOWS_RESERVED_DEVICE_NAMES.has(sessionUpper)) {
    throw new Error('RESERVED_DEVICE_NAME: Scope identity contains reserved Windows device name');
  }

  if (userId.includes('..') || sessionId.includes('..')) {
    throw new Error('PATH_TRAVERSAL: Scope identity contains disallowed path traversal characters');
  }
}

/**
 * EN: Asserts that a verification outcome is strictly VERIFIED and succeeded before commit preparation.
 * VI: Khẳng định kết quả xác minh bắt buộc phải là VERIFIED và thành công trước khi chuẩn bị commit.
 */
export function assertVerifiedForCommit(verification: {
  status: string;
  taskSucceeded: boolean;
}): void {
  if (verification.status === 'FAILED' || !verification.taskSucceeded) {
    throw new Error('UNVERIFIED_COMMIT_REJECTED: Failed verification result cannot be committed as successful state');
  }

  if (verification.status === 'UNKNOWN') {
    throw new Error('UNKNOWN_VERIFICATION_REJECTED: UNKNOWN verification status cannot silently become committed state');
  }

  if (verification.status === 'INCONCLUSIVE') {
    throw new Error('INCONCLUSIVE_VERIFICATION_REJECTED: INCONCLUSIVE verification status cannot silently become committed state');
  }

  if (verification.status !== 'VERIFIED') {
    throw new Error(`INVALID_VERIFICATION_STATUS: Expected status "VERIFIED", received "${verification.status}"`);
  }
}

/**
 * EN: Enforces that risk level is never downgraded during commit.
 * VI: Thực thi việc không bao giờ hạ cấp mức độ rủi ro trong quá trình commit.
 */
export function assertCommitRiskPreservation(
  priorRisk: PlanRiskLevel,
  currentRisk: PlanRiskLevel,
): void {
  const priorRank = RISK_HIERARCHY[priorRisk] ?? 1;
  const currentRank = RISK_HIERARCHY[currentRisk] ?? 1;

  if (currentRank < priorRank) {
    throw new Error(
      `RISK_DOWNGRADE_FORBIDDEN: Cannot downgrade commit risk from ${priorRisk} to ${currentRisk}`,
    );
  }
}
