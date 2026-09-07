// src/core/pairing/pairingRequest.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Canonical PairingRequest factory and validation.

import type {
  PairingRequest,
  ScopedDeviceIdentity,
  DeviceType,
  DeviceTrustLevel,
  SafeDeviceCapability,
} from './pairingTypes.js';
import { PAIRING_PROTOCOL_VERSION } from './pairingTypes.js';
import { deepFreeze, computePairingDigest, computeCapabilityFingerprint } from './pairingFingerprint.js';
import { isValidDeviceId } from './pairingIdentity.js';
import { createDeviceScope, scrubSecrets } from './pairingScope.js';
import { isValidDeviceType, isValidTrustLevel } from './pairingStates.js';
import { validatePairingCapabilities } from './pairingCapabilities.js';

export interface CreatePairingRequestParams {
  readonly deviceId: string;
  readonly deviceType: DeviceType;
  readonly surfaceId: string;
  readonly scope: ScopedDeviceIdentity;
  readonly capabilities: readonly SafeDeviceCapability[];
  readonly deviceFingerprint: string;
  readonly requestedTrustLevel?: DeviceTrustLevel;
  readonly sequence: number;
  readonly nonce: string;
  readonly protocolVersion?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Creates a canonical, immutable PairingRequest.
 */
export function createPairingRequest(params: CreatePairingRequestParams): PairingRequest {
  const protocolVersion = params.protocolVersion ?? PAIRING_PROTOCOL_VERSION;
  const requestedTrustLevel = params.requestedTrustLevel ?? 'TRUSTED';
  const validatedCapabilities = validatePairingCapabilities(params.capabilities);
  const scopeString = createDeviceScope(params.scope);
  const capabilityFingerprint = computeCapabilityFingerprint(validatedCapabilities);

  const pairingFingerprint = computePairingDigest({
    protocolVersion,
    deviceId: params.deviceId,
    deviceType: params.deviceType,
    surfaceId: params.surfaceId,
    scopeString,
    capabilityFingerprint,
    deviceFingerprint: params.deviceFingerprint,
    requestedTrustLevel,
    sequence: params.sequence,
    nonce: params.nonce,
  });

  const scrubbedMetadata = params.metadata ? scrubSecrets(params.metadata) : undefined;

  const request: PairingRequest = {
    protocolVersion,
    deviceId: params.deviceId,
    deviceType: params.deviceType,
    surfaceId: params.surfaceId,
    scope: Object.freeze({ ...params.scope }),
    capabilities: validatedCapabilities,
    deviceFingerprint: params.deviceFingerprint,
    requestedTrustLevel,
    pairingFingerprint,
    sequence: params.sequence,
    nonce: params.nonce,
    metadata: scrubbedMetadata ? Object.freeze(scrubbedMetadata) : undefined,
  };

  return deepFreeze(request);
}

/**
 * Authoritatively validates a PairingRequest against security boundaries.
 * Fails closed with typed error on any malformed or unpermitted field.
 */
export function validatePairingRequest(req: PairingRequest): void {
  if (!req || typeof req !== 'object') {
    throw new Error('[PAIRING_INVALID_REQUEST] Request must be a non-null object');
  }

  // 1. Protocol version validation
  if (req.protocolVersion !== PAIRING_PROTOCOL_VERSION) {
    throw new Error(
      `[PAIRING_PROTOCOL_MISMATCH] Incompatible protocol version: expected ${PAIRING_PROTOCOL_VERSION}, got ${req.protocolVersion}`
    );
  }

  // 2. Device ID format validation
  if (!isValidDeviceId(req.deviceId)) {
    throw new Error(`[PAIRING_INVALID_REQUEST] Malformed deviceId: ${req.deviceId}`);
  }

  // 3. Device type validation
  if (!isValidDeviceType(req.deviceType)) {
    throw new Error(`[PAIRING_INVALID_REQUEST] Unsupported deviceType: ${req.deviceType}`);
  }

  // 4. Requested trust level validation
  if (!isValidTrustLevel(req.requestedTrustLevel)) {
    throw new Error(`[PAIRING_INVALID_REQUEST] Invalid requestedTrustLevel: ${req.requestedTrustLevel}`);
  }

  // 5. Sequence and nonce validation
  if (typeof req.sequence !== 'number' || req.sequence < 1 || !Number.isInteger(req.sequence)) {
    throw new Error(`[PAIRING_INVALID_REQUEST] Invalid sequence number: ${req.sequence}`);
  }
  if (typeof req.nonce !== 'string' || req.nonce.trim().length === 0) {
    throw new Error('[PAIRING_INVALID_REQUEST] Nonce must be a non-empty string');
  }

  // 6. Scope validation
  if (!req.scope || typeof req.scope !== 'object') {
    throw new Error('[PAIRING_SCOPE_MISMATCH] Missing scope object');
  }
  if (req.scope.deviceId !== req.deviceId) {
    throw new Error(
      `[PAIRING_DEVICE_MISMATCH] Scope deviceId (${req.scope.deviceId}) does not match request deviceId (${req.deviceId})`
    );
  }
  createDeviceScope(req.scope); // asserts each segment

  // 7. Capabilities validation
  validatePairingCapabilities(req.capabilities);

  // 8. Pairing fingerprint verification
  const scopeString = createDeviceScope(req.scope);
  const capabilityFingerprint = computeCapabilityFingerprint(req.capabilities);
  const expectedFingerprint = computePairingDigest({
    protocolVersion: req.protocolVersion,
    deviceId: req.deviceId,
    deviceType: req.deviceType,
    surfaceId: req.surfaceId,
    scopeString,
    capabilityFingerprint,
    deviceFingerprint: req.deviceFingerprint,
    requestedTrustLevel: req.requestedTrustLevel,
    sequence: req.sequence,
    nonce: req.nonce,
  });

  if (req.pairingFingerprint !== expectedFingerprint) {
    throw new Error('[PAIRING_INVALID_REQUEST] Pairing fingerprint mismatch or corrupted payload');
  }
}
