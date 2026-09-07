// src/core/pairing/index.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Canonical barrel export for the pairing subsystem.

export * from './pairingTypes.js';
export * from './pairingStates.js';
export * from './pairingTransitions.js';

export {
  canonicalizePairingData,
  fnv1a32Pairing,
  computePairingDigest,
  computeCapabilityFingerprint,
  computePairingFingerprint,
  deepFreezePairing,
} from './pairingFingerprint.js';

export * from './pairingIdentity.js';

export {
  validatePairingScopeSegment,
  createDeviceScope,
  parseDeviceScope,
  areDeviceScopesEqual,
  assertDeviceScopeMatches,
  scrubPairingSecrets,
} from './pairingScope.js';

export * from './pairingCapabilities.js';
export * from './pairingRecord.js';
export * from './pairingRequest.js';
export * from './pairingResponse.js';
export * from './pairingConfirmation.js';
export * from './pairingReplay.js';
export * from './pairingRevocation.js';
export * from './pairingRecognition.js';
export * from './pairingRegistry.js';
export * from './pairingTrustRegistry.js';
export * from './pairingAudit.js';
export * from './pairingError.js';
export * from './pairingRuntime.js';
