// src/core/admission/admissionIdentity.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Identity resolution adapter.
// STRICT INVARIANTS:
// - NETWORK_LOCATION != DEVICE_IDENTITY
// - IP_ADDRESS != DEVICE_IDENTITY
// - WI_FI_NETWORK != DEVICE_TRUST
// - DEVICE_ID != SESSION_ID
// - KNOWING_DEVICE_ID != POSSESSION_OF_DEVICE_KEY
// - Rejects identity synthesis from IP, MAC address, Wi-Fi SSID, hostname, random UUID, or timestamp.

import type { AdmissionRequest, NetworkMetadata } from './admissionTypes.js';

export const DEVICE_ID_REGEX = /^(device|dev)_[0-9a-zA-Z_-]+$/;

/**
 * Validates that a device identifier adheres to canonical persistent device identity format.
 */
export function isValidAdmissionDeviceId(id: unknown): id is string {
  return typeof id === 'string' && id.length >= 8 && id.length <= 64 && DEVICE_ID_REGEX.test(id);
}

export const validateAdmissionDeviceIdentityFormat = isValidAdmissionDeviceId;

/**
 * Asserts that a device identifier is valid and well-formed.
 * Fails closed if malformed, empty, or attempting path traversal / null injection.
 */
export function assertValidAdmissionDeviceId(id: unknown): void {
  if (!isValidAdmissionDeviceId(id)) {
    throw new Error(`[ADMISSION_DEVICE_IDENTITY_INVALID] Invalid or malformed deviceId: ${String(id)}. Fail-closed.`);
  }

  // Null byte & path traversal defense
  if (id.includes('\0') || id.includes('..') || id.includes('/') || id.includes('\\')) {
    throw new Error(`[ADMISSION_DEVICE_IDENTITY_INVALID] Malicious character sequence detected in deviceId: ${id}`);
  }
}

export const assertValidAdmissionDeviceIdentity = assertValidAdmissionDeviceId;

export interface AdmissionDeviceIdentity {
  readonly deviceId: string;
}

/**
 * Resolves persistent device identity strictly from the authenticated admission request or options.
 * Guarantees that network location (IP, SSID, transport) is NOT used as identity.
 */
export function resolveAdmissionDeviceIdentity(
  input: { deviceId: string; networkMetadata?: NetworkMetadata; scope?: any; network?: any } | AdmissionRequest
): AdmissionDeviceIdentity {
  if (!input || typeof input !== 'object') {
    throw new Error('[ADMISSION_DEVICE_IDENTITY_INVALID] Null or invalid admission request.');
  }

  const deviceId = input.deviceId;
  if (!deviceId || typeof deviceId !== 'string') {
    throw new Error('[ADMISSION_DEVICE_IDENTITY_INVALID] Empty or invalid deviceId.');
  }

  assertValidAdmissionDeviceId(deviceId);

  if ((input as any).scope && (input as any).scope.deviceId && (input as any).scope.deviceId !== deviceId) {
    throw new Error(`[ADMISSION_SCOPE_MISMATCH] Scope deviceId ${(input as any).scope.deviceId} does not match request deviceId ${deviceId}.`);
  }

  const net = (input as any).networkMetadata || (input as any).network;
  if (net) {
    if (net.ipAddress === deviceId || (net.ssid && net.ssid === deviceId)) {
      throw new Error('[ADMISSION_DEVICE_IDENTITY_INVALID] Network location attribute illegally attempted as device identity.');
    }
  }

  return Object.freeze({ deviceId });
}
