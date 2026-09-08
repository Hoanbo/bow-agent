// src/core/deviceIdentity/persistentDeviceRecognition.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative passwordless device recognition workflow.
// Enforces challenge-response verification before granting RECOGNIZED status.
// Invariant: RECOGNIZED != AUTHORIZED != EXECUTED. Zero tool execution.

import type {
  PersistentDeviceTrustRecord,
  DeviceChallenge,
  DeviceProof,
  DeviceRecognitionResult,
} from './persistentDeviceTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { createDeviceScope } from '../pairing/pairingScope.js';
import type { PersistentDeviceStore } from './persistentDeviceStorage.js';
import type { DeviceKeyStore } from './persistentDeviceKey.js';
import { verifyDeviceProof } from './persistentDeviceProof.js';
import { validatePersistentDeviceTrust } from './persistentDeviceTrust.js';
import { updatePersistentDeviceTrustRecord } from './persistentDeviceRecord.js';

export interface RecognizeDeviceInput {
  readonly deviceId: string;
  readonly scope: ScopedDeviceIdentity;
  readonly challenge?: DeviceChallenge;
  readonly proof?: DeviceProof;
  readonly currentTime?: number;
}

export interface AttemptDeviceRecognitionParams {
  readonly record: PersistentDeviceTrustRecord;
  readonly challenge: DeviceChallenge;
  readonly proof: DeviceProof;
  readonly targetScope: ScopedDeviceIdentity;
  readonly keyStore: DeviceKeyStore;
  readonly store?: PersistentDeviceStore;
  readonly currentTime?: number;
}

/**
 * Executes authoritative passwordless device recognition.
 * Fails closed on missing records, unverified proofs, expired challenges, or revoked trust.
 */
export function recognizePersistentDevice(
  store: PersistentDeviceStore,
  keyStore: DeviceKeyStore,
  input: RecognizeDeviceInput
): DeviceRecognitionResult {
  const now = input.currentTime ?? Date.now();
  const scopeString = createDeviceScope(input.scope);

  // 1. Lookup stored trust record
  const record = store.findByDeviceId(input.deviceId, scopeString);
  if (!record) {
    return {
      recognized: false,
      state: 'PAIRING_REQUIRED',
      sessionEligible: false,
      failureCode: 'DEVICE_NOT_FOUND',
      failureReason: `Device ${input.deviceId} is not enrolled or trusted in this scope; pairing required`,
      timestamp: now,
    };
  }

  // 2. Validate current trust state (revocation, scope, expiration, key state)
  const trustValidation = validatePersistentDeviceTrust(record, input.scope, now);
  if (!trustValidation.trusted) {
    return {
      recognized: false,
      state: record.lifecycleState === 'REVOKED' ? 'REVOKED' : 'FAILED',
      record,
      sessionEligible: false,
      failureCode: trustValidation.failureCode,
      failureReason: trustValidation.failureReason,
      timestamp: now,
    };
  }

  // 3. If no proof is provided, recognition cannot complete (challenge required)
  if (!input.proof || !input.challenge) {
    return {
      recognized: false,
      state: 'RECOGNITION_CHALLENGE',
      record,
      sessionEligible: false,
      failureCode: 'DEVICE_INVALID_REQUEST',
      failureReason: 'Cryptographic challenge-response proof required for passwordless recognition',
      timestamp: now,
    };
  }

  // 4. Verify cryptographic device proof
  const proofResult = verifyDeviceProof(input.challenge, input.proof, keyStore, now);
  if (!proofResult.valid) {
    return {
      recognized: false,
      state: 'FAILED',
      record,
      sessionEligible: false,
      failureCode: proofResult.failureCode,
      failureReason: proofResult.failureReason,
      timestamp: now,
    };
  }

  // 5. Update record to RECOGNIZED -> SESSION_ELIGIBLE
  const recognizedRecord = updatePersistentDeviceTrustRecord(record, 'RECOGNIZED', undefined, now);
  const eligibleRecord = updatePersistentDeviceTrustRecord(recognizedRecord, 'SESSION_ELIGIBLE', undefined, now);
  store.updateTrustState(eligibleRecord);

  return {
    recognized: true,
    state: 'SESSION_ELIGIBLE',
    record: eligibleRecord,
    sessionEligible: true,
    timestamp: now,
  };
}

export function attemptDeviceRecognition(
  paramsOrStore: AttemptDeviceRecognitionParams | PersistentDeviceStore,
  maybeKeyStore?: DeviceKeyStore,
  maybeInput?: RecognizeDeviceInput
): DeviceRecognitionResult {
  if (maybeKeyStore && maybeInput) {
    return recognizePersistentDevice(paramsOrStore as PersistentDeviceStore, maybeKeyStore, maybeInput);
  }
  const params = paramsOrStore as AttemptDeviceRecognitionParams;
  const now = params.currentTime ?? Date.now();

  const trustValidation = validatePersistentDeviceTrust(params.record, params.targetScope, now);
  if (!trustValidation.trusted) {
    return {
      recognized: false,
      state: params.record.lifecycleState === 'REVOKED' ? 'REVOKED' : 'FAILED',
      record: params.record,
      sessionEligible: false,
      failureCode: trustValidation.failureCode,
      failureReason: trustValidation.failureReason,
      timestamp: now,
    };
  }

  const proofResult = verifyDeviceProof(params.challenge, params.proof, params.keyStore, now);
  if (!proofResult.valid) {
    return {
      recognized: false,
      state: 'FAILED',
      record: params.record,
      sessionEligible: false,
      failureCode: proofResult.failureCode,
      failureReason: proofResult.failureReason,
      timestamp: now,
    };
  }

  const recognizedRecord = updatePersistentDeviceTrustRecord(params.record, 'RECOGNIZED', undefined, now);
  const eligibleRecord = updatePersistentDeviceTrustRecord(recognizedRecord, 'SESSION_ELIGIBLE', undefined, now);
  if (params.store) {
    params.store.save(eligibleRecord);
  }

  return {
    recognized: true,
    state: 'SESSION_ELIGIBLE',
    record: eligibleRecord,
    sessionEligible: true,
    timestamp: now,
  };
}
