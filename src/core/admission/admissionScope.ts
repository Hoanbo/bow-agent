// src/core/admission/admissionScope.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// 9-tuple and 8-tuple scope isolation enforcement.
// STRICT INVARIANTS:
// - No cross-user admission
// - No cross-device trust
// - No cross-session leakage
// - No cross-brain leakage
// - No cross-surface trust escalation
// - Prototype pollution & null injection defense

import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { ScopedConnectionIdentity } from '../connection/connectionTypes.js';

const FORBIDDEN_TOKENS = ['\0', '..', '__proto__', 'constructor', 'prototype'];

export interface ScopeValidationResult {
  readonly valid: boolean;
  readonly failureCode?: string;
  readonly failureReason?: string;
}

/**
 * Validates a single scope string property against malicious sequences.
 */
function isSafeScopeString(val: unknown): val is string {
  if (typeof val !== 'string' || val.trim().length === 0) {
    return false;
  }
  return !FORBIDDEN_TOKENS.some((token) => val.includes(token));
}

/**
 * Validates a 9-tuple ScopedDeviceIdentity.
 */
export function validateAdmissionDeviceScope(scope: ScopedDeviceIdentity): ScopeValidationResult {
  if (!scope || typeof scope !== 'object') {
    return { valid: false, failureCode: 'ADMISSION_SCOPE_INVALID', failureReason: 'Scope must be an object' };
  }

  const requiredFields: (keyof ScopedDeviceIdentity)[] = [
    'userId',
    'sessionId',
    'deviceId',
    'surfaceId',
    'brainId',
    'transportId',
    'gatewayId',
    'adapterId',
    'connectionId',
  ];

  for (const field of requiredFields) {
    if (!isSafeScopeString(scope[field])) {
      return {
        valid: false,
        failureCode: 'ADMISSION_SCOPE_INVALID',
        failureReason: `Invalid or missing required scope field: ${field}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Asserts that a 9-tuple ScopedDeviceIdentity is valid.
 */
export function assertValidAdmissionDeviceScope(scope: ScopedDeviceIdentity): void {
  const res = validateAdmissionDeviceScope(scope);
  if (!res.valid) {
    throw new Error(`[${res.failureCode}] ${res.failureReason}`);
  }
}

/**
 * Verifies compatibility between incoming request scope and trusted stored scope.
 * Prevents cross-user, cross-device, cross-brain, cross-surface trust escalation.
 */
export function areAdmissionScopesCompatible(
  requestScope: any,
  trustedScope: any
): boolean {
  if (!requestScope || !trustedScope) return false;
  if (requestScope.userId && trustedScope.userId && requestScope.userId !== trustedScope.userId) return false;
  if (requestScope.deviceId && trustedScope.deviceId && requestScope.deviceId !== trustedScope.deviceId) return false;
  if (requestScope.brainId && trustedScope.brainId && requestScope.brainId !== trustedScope.brainId) return false;
  if (requestScope.surfaceId && trustedScope.surfaceId && requestScope.surfaceId !== trustedScope.surfaceId) return false;
  return true;
}

/**
 * Validates alignment between 9-tuple device scope and 8-tuple connection scope.
 */
export function areDeviceAndConnectionScopesAligned(
  deviceScope: ScopedDeviceIdentity,
  connectionScope: ScopedConnectionIdentity
): boolean {
  return (
    deviceScope.userId === connectionScope.userId &&
    deviceScope.sessionId === connectionScope.sessionId &&
    deviceScope.brainId === connectionScope.brainId &&
    deviceScope.surfaceId === connectionScope.surfaceId &&
    deviceScope.transportId === connectionScope.transportId &&
    deviceScope.gatewayId === connectionScope.gatewayId &&
    deviceScope.adapterId === connectionScope.adapterId &&
    deviceScope.connectionId === connectionScope.connectionId
  );
}

export function validateAdmissionScope(scope1: any, scope2?: any): boolean {
  if (scope2) {
    return areAdmissionScopesCompatible(scope1, scope2);
  }
  return validateAdmissionDeviceScope(scope1).valid;
}

export function assertValidAdmissionScope(scope1: any, scope2?: any): void {
  if (scope2) {
    if (!areAdmissionScopesCompatible(scope1, scope2)) {
      throw new Error(`[ADMISSION_SCOPE_MISMATCH] Scope mismatch: cross-boundary trust escalation detected.`);
    }
    return;
  }
  assertValidAdmissionDeviceScope(scope1);
}

export function isAdmissionScopeIsolated(scope1: any, scope2: any): boolean {
  return !areAdmissionScopesCompatible(scope1, scope2);
}

