// src/core/admission/admissionDecision.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Immutable, frozen AdmissionDecision factory helpers.
// Invariant: Fail-closed. Decisions are cryptographically fingerprinted and tamper-evident.

import type {
  AdmissionDecision,
  AdmissionDecisionType,
  AdmissionRejectionReason,
  AdmissionRequest,
} from './admissionTypes.js';
import type { DeviceChallenge } from '../deviceIdentity/persistentDeviceTypes.js';
import { computeDeviceDigest, deepFreezeDevice } from '../deviceIdentity/persistentDeviceFingerprint.js';

export interface CreateDecisionParams {
  readonly request: AdmissionRequest;
  readonly decision: AdmissionDecisionType;
  readonly admitted: boolean;
  readonly assignedSessionId?: string;
  readonly allowedCapabilities?: readonly string[];
  readonly rejectedCapabilities?: readonly string[];
  readonly rejectionReason?: AdmissionRejectionReason;
  readonly rejectionDetails?: string;
  readonly challenge?: DeviceChallenge;
  readonly timestamp?: number;
}

/**
 * Creates an authoritative, deeply frozen AdmissionDecision.
 */
export function createAdmissionDecision(params: CreateDecisionParams): AdmissionDecision {
  const now = params.timestamp ?? Date.now();
  const decisionId = `admdec_${computeDeviceDigest({
    requestId: params.request.requestId,
    deviceId: params.request.deviceId,
    decision: params.decision,
    timestamp: now,
  })}`;

  const allowedCapabilities = params.allowedCapabilities ? Object.freeze([...params.allowedCapabilities]) : Object.freeze([]);
  const rejectedCapabilities = params.rejectedCapabilities ? Object.freeze([...params.rejectedCapabilities]) : Object.freeze([]);

  const decisionFingerprint = computeDeviceDigest({
    decisionId,
    requestId: params.request.requestId,
    deviceId: params.request.deviceId,
    decision: params.decision,
    admitted: params.admitted,
    assignedSessionId: params.assignedSessionId,
    allowedCapabilities,
    rejectedCapabilities,
    rejectionReason: params.rejectionReason,
    timestamp: now,
  });

  const decisionObj: AdmissionDecision = {
    decisionId,
    requestId: params.request.requestId,
    decision: params.decision,
    admitted: params.admitted,
    deviceId: params.request.deviceId,
    scope: params.request.scope,
    assignedSessionId: params.assignedSessionId,
    session: params.assignedSessionId ? Object.freeze({ sessionId: params.assignedSessionId }) : undefined,
    allowedCapabilities,
    rejectedCapabilities,
    rejectionReason: params.rejectionReason,
    rejectionDetails: params.rejectionDetails,
    challenge: params.challenge,
    network: params.request.network,
    timestamp: now,
    decisionFingerprint,
  };

  return deepFreezeDevice(decisionObj);
}

export function createAdmitDecision(
  request: AdmissionRequest,
  assignedSessionId: string,
  allowedCapabilities: readonly string[],
  timestamp?: number
): AdmissionDecision {
  return createAdmissionDecision({
    request,
    decision: 'ADMIT',
    admitted: true,
    assignedSessionId,
    allowedCapabilities,
    timestamp,
  });
}

export function createRejectDecision(
  request: AdmissionRequest,
  reason: AdmissionRejectionReason,
  details: string,
  timestamp?: number
): AdmissionDecision {
  return createAdmissionDecision({
    request,
    decision: 'REJECT',
    admitted: false,
    rejectionReason: reason,
    rejectionDetails: details,
    timestamp,
  });
}

export function createChallengeRequiredDecision(
  request: AdmissionRequest,
  challenge: DeviceChallenge,
  timestamp?: number
): AdmissionDecision {
  return createAdmissionDecision({
    request,
    decision: 'CHALLENGE_REQUIRED',
    admitted: false,
    challenge,
    timestamp,
  });
}
