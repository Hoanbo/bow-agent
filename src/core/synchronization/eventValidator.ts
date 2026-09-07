// src/core/synchronization/eventValidator.ts
// BOWCON V4.0 — MILESTONE 1.3.18: BRAIN EVENT SECURITY & SCOPE VALIDATOR
//
// EN:
// Authoritative security defenses, multi-tenant scope isolation (${userId}::${sessionId}::${brainId}),
// prototype pollution defense, null-byte checks, path traversal checks, Windows reserved name defense,
// monotonic risk preservation, sequence monotonicity, and secret scrubbing.
//
// VI:
// Phòng thủ bảo mật có thẩm quyền, cô lập phạm vi đa người dùng (${userId}::${sessionId}::${brainId}),
// chống ô nhiễm prototype, kiểm tra null-byte, duyệt đường dẫn, tên thiết bị cấm của Windows,
// bảo toàn rủi ro đơn điệu, tính đơn điệu của chuỗi, và lọc sạch bí mật.

import type { PlanRiskLevel } from '../planning/planningTypes.js';

/**
 * EN: Windows reserved device names that must never appear in identifiers or file paths.
 * VI: Các tên thiết bị được bảo lưu của Windows không bao giờ được xuất hiện trong định danh.
 */
const WINDOWS_RESERVED_NAMES = Object.freeze(
  new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
  ]),
);

/**
 * EN: Regex patterns detecting sensitive credentials, tokens, and keys.
 * VI: Các biểu thức chính quy phát hiện thông tin xác thực, token và khóa nhạy cảm.
 */
const SENSITIVE_PATTERNS = Object.freeze([
  /(?:api[_-]?key|secret|token|password|bearer|auth|private[_-]?key)\s*[:=]\s*["']?([a-zA-Z0-9_\-.]{8,})["']?/i,
  /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,})\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
]);

/**
 * EN: Validates a generic string identifier against injection, traversal, and reserved names.
 * VI: Kiểm tra một định danh chuỗi tổng quát chống lại tiêm nhiễm, duyệt đường dẫn và tên cấm.
 */
export function validateEventIdentifier(name: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(`[SYNCHRONIZATION_VALIDATION_ERROR] Identifier "${name}" must be a non-empty string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`[SYNCHRONIZATION_VALIDATION_ERROR] Identifier "${name}" cannot be empty.`);
  }

  // Null byte injection check
  if (trimmed.includes('\0')) {
    throw new Error(`[SYNCHRONIZATION_SECURITY_ERROR] Null bytes forbidden in identifier "${name}".`);
  }

  // Prototype pollution tokens
  if (
    trimmed === '__proto__' ||
    trimmed === 'constructor' ||
    trimmed === 'prototype' ||
    trimmed.includes('__proto__') ||
    trimmed.includes('constructor.prototype')
  ) {
    throw new Error(`[SYNCHRONIZATION_SECURITY_ERROR] Prototype pollution token forbidden in identifier "${name}".`);
  }

  // Path traversal check
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error(`[SYNCHRONIZATION_SECURITY_ERROR] Path traversal tokens forbidden in identifier "${name}".`);
  }

  // Windows reserved device check
  const upper = trimmed.toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(upper)) {
    throw new Error(`[SYNCHRONIZATION_SECURITY_ERROR] Windows reserved device name forbidden in identifier "${name}": "${upper}".`);
  }

  return trimmed;
}

/**
 * EN: Validates multi-tenant scope isolation inputs (userId, sessionId, brainId).
 * VI: Kiểm tra đầu vào cô lập phạm vi đa người dùng (userId, sessionId, brainId).
 */
export function validateSyncScope(
  userId: unknown,
  sessionId: unknown,
  brainId: unknown,
): { userId: string; sessionId: string; brainId: string } {
  const validUser = validateEventIdentifier('userId', userId);
  const validSession = validateEventIdentifier('sessionId', sessionId);
  const validBrain = validateEventIdentifier('brainId', brainId);
  return { userId: validUser, sessionId: validSession, brainId: validBrain };
}

/**
 * EN: Checks whether a string contains sensitive patterns.
 * VI: Kiểm tra xem chuỗi có chứa mẫu hình nhạy cảm hay không.
 */
export function containsEventSecret(input: string): boolean {
  return SENSITIVE_PATTERNS.some(pat => pat.test(input));
}

/**
 * EN: Redacts sensitive secrets from log and error messages.
 * VI: Che dấu các bí mật nhạy cảm khỏi thông báo lỗi và nhật ký.
 */
export function redactEventSecrets(input: string): string {
  let result = input;
  for (const pat of SENSITIVE_PATTERNS) {
    result = result.replace(pat, '[REDACTED_SECRET]');
  }
  return result;
}

/**
 * EN: Numerical rank for monotonic risk preservation.
 * VI: Thứ hạng số học để bảo toàn rủi ro đơn điệu.
 */
const RISK_ORDER: Record<PlanRiskLevel, number> = Object.freeze({
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
});

/**
 * EN: Asserts risk preservation: new risk must NEVER be lower than prior risk.
 * VI: Khẳng định bảo toàn rủi ro: rủi ro mới KHÔNG BAO GIỜ được thấp hơn rủi ro trước.
 */
export function assertEventRiskPreservation(
  priorRisk: PlanRiskLevel,
  newRisk: PlanRiskLevel,
): void {
  const priorRank = RISK_ORDER[priorRisk] ?? 1;
  const newRank = RISK_ORDER[newRisk] ?? 1;
  if (newRank < priorRank) {
    throw new Error(
      `[SYNCHRONIZATION_RISK_DOWNGRADE_ERROR] Monotonic risk violation: cannot downgrade risk from ${priorRisk} to ${newRisk}.`,
    );
  }
}

/**
 * EN: Asserts sequence monotonicity: sequence numbers must be positive and non-decreasing.
 * VI: Khẳng định tính đơn điệu của chuỗi: số thứ tự phải là số nguyên dương và không giảm.
 */
export function assertEventSequenceMonotonicity(
  priorSequence: number,
  newSequence: number,
): void {
  if (typeof newSequence !== 'number' || isNaN(newSequence) || !Number.isInteger(newSequence) || newSequence <= 0) {
    throw new Error(`[SYNCHRONIZATION_SEQUENCE_ERROR] Invalid sequence number: ${newSequence}. Must be positive integer.`);
  }
  if (newSequence < priorSequence) {
    throw new Error(
      `[SYNCHRONIZATION_SEQUENCE_ERROR] Monotonic sequence violation: new sequence ${newSequence} is less than prior sequence ${priorSequence}.`,
    );
  }
}
