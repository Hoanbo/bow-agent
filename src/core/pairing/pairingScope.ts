// src/core/pairing/pairingScope.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Authoritative 9-tuple scope enforcement:
// ${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}::${gatewayId}::${adapterId}::${connectionId}::${deviceId}
// Defends against prototype pollution, null byte injection, path traversal, and Windows reserved names.
// Also provides recursive secret scrubbing.

import type { ScopedDeviceIdentity } from './pairingTypes.js';

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

const FORBIDDEN_PROPERTY_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

export const SECRET_PATTERNS = [
  /password/i,
  /token/i,
  /accessToken/i,
  /refreshToken/i,
  /secret/i,
  /apiKey/i,
  /authorization/i,
  /cookie/i,
  /sessionSecret/i,
  /privateKey/i,
  /credential/i,
];

/**
 * Validates an individual scope segment against security constraints.
 */
export function validatePairingScopeSegment(segment: string, segmentName: string): void {
  if (typeof segment !== 'string' || segment.trim().length === 0) {
    throw new Error(`[PAIRING_SCOPE_ERROR] Scope segment ${segmentName} cannot be empty`);
  }
  if (segment.length > 128) {
    throw new Error(`[PAIRING_SCOPE_ERROR] Scope segment ${segmentName} exceeds maximum length 128`);
  }
  if (segment.includes('\0')) {
    throw new Error(`[PAIRING_SCOPE_ERROR] Null byte detected in ${segmentName}`);
  }
  if (segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
    throw new Error(`[PAIRING_SCOPE_ERROR] Path traversal characters detected in ${segmentName}`);
  }
  if (FORBIDDEN_PROPERTY_NAMES.has(segment)) {
    throw new Error(`[PAIRING_SCOPE_ERROR] Prototype pollution attempt detected in ${segmentName}`);
  }
  const upper = segment.toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(upper)) {
    throw new Error(`[PAIRING_SCOPE_ERROR] Windows reserved device name forbidden in ${segmentName}: ${segment}`);
  }
}

export const validateScopeSegment = validatePairingScopeSegment;

/**
 * Creates canonical 9-tuple scope string.
 */
export function createDeviceScope(identity: ScopedDeviceIdentity): string {
  validatePairingScopeSegment(identity.userId, 'userId');
  validatePairingScopeSegment(identity.sessionId, 'sessionId');
  validatePairingScopeSegment(identity.brainId, 'brainId');
  validatePairingScopeSegment(identity.surfaceId, 'surfaceId');
  validatePairingScopeSegment(identity.transportId, 'transportId');
  validatePairingScopeSegment(identity.gatewayId, 'gatewayId');
  validatePairingScopeSegment(identity.adapterId, 'adapterId');
  validatePairingScopeSegment(identity.connectionId, 'connectionId');
  validatePairingScopeSegment(identity.deviceId, 'deviceId');

  return [
    identity.userId,
    identity.sessionId,
    identity.brainId,
    identity.surfaceId,
    identity.transportId,
    identity.gatewayId,
    identity.adapterId,
    identity.connectionId,
    identity.deviceId,
  ].join('::');
}

/**
 * Parses a canonical 9-tuple scope string back into ScopedDeviceIdentity.
 */
export function parseDeviceScope(scopeString: string): ScopedDeviceIdentity {
  if (typeof scopeString !== 'string') {
    throw new Error('[PAIRING_SCOPE_ERROR] Scope string must be a string');
  }
  const parts = scopeString.split('::');
  if (parts.length !== 9) {
    throw new Error(`[PAIRING_SCOPE_ERROR] Invalid scope tuple length: expected 9, got ${parts.length}`);
  }
  const [
    userId,
    sessionId,
    brainId,
    surfaceId,
    transportId,
    gatewayId,
    adapterId,
    connectionId,
    deviceId,
  ] = parts;

  validatePairingScopeSegment(userId, 'userId');
  validatePairingScopeSegment(sessionId, 'sessionId');
  validatePairingScopeSegment(brainId, 'brainId');
  validatePairingScopeSegment(surfaceId, 'surfaceId');
  validatePairingScopeSegment(transportId, 'transportId');
  validatePairingScopeSegment(gatewayId, 'gatewayId');
  validatePairingScopeSegment(adapterId, 'adapterId');
  validatePairingScopeSegment(connectionId, 'connectionId');
  validatePairingScopeSegment(deviceId, 'deviceId');

  return {
    userId,
    sessionId,
    brainId,
    surfaceId,
    transportId,
    gatewayId,
    adapterId,
    connectionId,
    deviceId,
  };
}

/**
 * Compares two 9-tuple ScopedDeviceIdentity objects for strict equality.
 */
export function areDeviceScopesEqual(a: ScopedDeviceIdentity, b: ScopedDeviceIdentity): boolean {
  return (
    a.userId === b.userId &&
    a.sessionId === b.sessionId &&
    a.brainId === b.brainId &&
    a.surfaceId === b.surfaceId &&
    a.transportId === b.transportId &&
    a.gatewayId === b.gatewayId &&
    a.adapterId === b.adapterId &&
    a.connectionId === b.connectionId &&
    a.deviceId === b.deviceId
  );
}

export const areScopesEqual = areDeviceScopesEqual;

/**
 * Asserts that two scopes match exactly; fails closed with typed error message otherwise.
 */
export function assertDeviceScopeMatches(expected: ScopedDeviceIdentity, actual: ScopedDeviceIdentity): void {
  if (!areDeviceScopesEqual(expected, actual)) {
    throw new Error(
      `[PAIRING_SCOPE_MISMATCH] Scope mismatch: expected (${createDeviceScope(expected)}) vs actual (${createDeviceScope(actual)})`
    );
  }
}

export const assertScopeMatches = assertDeviceScopeMatches;

/**
 * Recursively scrubs sensitive secrets from an arbitrary object.
 * Replaces values of matching sensitive keys with '[REDACTED]'.
 */
export function scrubPairingSecrets<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => scrubPairingSecrets(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SECRET_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = scrubPairingSecrets(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export const scrubSecrets = scrubPairingSecrets;

