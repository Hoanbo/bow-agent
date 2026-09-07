// src/core/connection/connectionScope.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Authoritative 8-tuple scope enforcement:
// ${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}::${gatewayId}::${adapterId}::${connectionId}
// Any scope mismatch, prototype pollution, null byte, path traversal, or reserved name fails closed.

import type { ScopedConnectionIdentity } from './connectionTypes.js';

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

const FORBIDDEN_PROPERTY_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

const SECRET_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /apiKey/i,
  /authorization/i,
  /cookie/i,
  /sessionSecret/i,
  /privateKey/i,
  /credential/i,
];

/**
 * Validates a single scope segment against security boundaries
 */
export function validateScopeSegment(segment: string, segmentName: string): void {
  if (typeof segment !== 'string' || segment.trim().length === 0) {
    throw new Error(`[CONNECTION_SCOPE_ERROR] Scope segment ${segmentName} cannot be empty`);
  }
  if (segment.length > 128) {
    throw new Error(`[CONNECTION_SCOPE_ERROR] Scope segment ${segmentName} exceeds maximum length 128`);
  }
  if (segment.includes('\0')) {
    throw new Error(`[CONNECTION_SCOPE_ERROR] Null byte detected in ${segmentName}`);
  }
  if (segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
    throw new Error(`[CONNECTION_SCOPE_ERROR] Path traversal characters detected in ${segmentName}`);
  }
  if (FORBIDDEN_PROPERTY_NAMES.has(segment)) {
    throw new Error(`[CONNECTION_SCOPE_ERROR] Prototype pollution attempt detected in ${segmentName}`);
  }
  const upper = segment.toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(upper)) {
    throw new Error(`[CONNECTION_SCOPE_ERROR] Windows reserved device name forbidden in ${segmentName}: ${segment}`);
  }
}

/**
 * Creates canonical 8-tuple scope string
 */
export function createConnectionScope(identity: ScopedConnectionIdentity): string {
  validateScopeSegment(identity.userId, 'userId');
  validateScopeSegment(identity.sessionId, 'sessionId');
  validateScopeSegment(identity.brainId, 'brainId');
  validateScopeSegment(identity.surfaceId, 'surfaceId');
  validateScopeSegment(identity.transportId, 'transportId');
  validateScopeSegment(identity.gatewayId, 'gatewayId');
  validateScopeSegment(identity.adapterId, 'adapterId');
  validateScopeSegment(identity.connectionId, 'connectionId');

  return `${identity.userId}::${identity.sessionId}::${identity.brainId}::${identity.surfaceId}::${identity.transportId}::${identity.gatewayId}::${identity.adapterId}::${identity.connectionId}`;
}

/**
 * Parses canonical 8-tuple scope string into ScopedConnectionIdentity
 */
export function parseConnectionScope(scopeStr: string): ScopedConnectionIdentity {
  if (typeof scopeStr !== 'string') {
    throw new Error('[CONNECTION_SCOPE_ERROR] Scope string must be a string');
  }
  const parts = scopeStr.split('::');
  if (parts.length !== 8) {
    throw new Error(`[CONNECTION_SCOPE_ERROR] Invalid 8-tuple scope format, expected 8 parts, got ${parts.length}`);
  }

  const identity: ScopedConnectionIdentity = {
    userId: parts[0]!,
    sessionId: parts[1]!,
    brainId: parts[2]!,
    surfaceId: parts[3]!,
    transportId: parts[4]!,
    gatewayId: parts[5]!,
    adapterId: parts[6]!,
    connectionId: parts[7]!,
  };

  validateScopeSegment(identity.userId, 'userId');
  validateScopeSegment(identity.sessionId, 'sessionId');
  validateScopeSegment(identity.brainId, 'brainId');
  validateScopeSegment(identity.surfaceId, 'surfaceId');
  validateScopeSegment(identity.transportId, 'transportId');
  validateScopeSegment(identity.gatewayId, 'gatewayId');
  validateScopeSegment(identity.adapterId, 'adapterId');
  validateScopeSegment(identity.connectionId, 'connectionId');

  return Object.freeze(identity);
}

/**
 * Compares two ScopedConnectionIdentity instances, throwing on mismatch (fail closed)
 */
export function assertConnectionScopeMatch(
  expected: ScopedConnectionIdentity,
  actual: ScopedConnectionIdentity
): void {
  if (
    expected.userId !== actual.userId ||
    expected.sessionId !== actual.sessionId ||
    expected.brainId !== actual.brainId ||
    expected.surfaceId !== actual.surfaceId ||
    expected.transportId !== actual.transportId ||
    expected.gatewayId !== actual.gatewayId ||
    expected.adapterId !== actual.adapterId ||
    expected.connectionId !== actual.connectionId
  ) {
    throw new Error(
      `[CONNECTION_SCOPE_MISMATCH] Scope mismatch: expected ${createConnectionScope(expected)} but got ${createConnectionScope(actual)}`
    );
  }
}

/**
 * Recursively deep freezes an object
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = (obj as any)[key];
    if (val !== null && (typeof val === 'object' || typeof val === 'function') && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj as Readonly<T>;
}

/**
 * Scrubs credentials and secrets from text or object structures
 */
export function scrubConnectionSecrets<T>(val: T): T {
  if (typeof val === 'string') {
    let scrubbed: string = val;
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(scrubbed)) {
        scrubbed = scrubbed.replace(/(?:password|token|secret|apiKey|authorization|cookie|sessionSecret|privateKey|credential)\s*[:=]\s*['"]?([^\s'",;]+)['"]?/gi, '***REDACTED***');
      }
    }
    return scrubbed as unknown as T;
  }

  if (Array.isArray(val)) {
    return val.map((item) => scrubConnectionSecrets(item)) as unknown as T;
  }

  if (val !== null && typeof val === 'object') {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (SECRET_PATTERNS.some((p) => p.test(k))) {
        res[k] = '***REDACTED***';
      } else {
        res[k] = scrubConnectionSecrets(v);
      }
    }
    return res as unknown as T;
  }

  return val;
}
