import type { DeviceChallenge, DeviceProof, DeviceProofVerificationResult } from '../deviceIdentity/persistentDeviceTypes.js';
import type { DeviceKeyStore } from '../deviceIdentity/persistentDeviceKey.js';
/**
 * Validates an incoming admission proof against the issued challenge and registered device key store.
 */
export declare function validateAdmissionProof(challenge: DeviceChallenge, proof: DeviceProof | undefined, keyStore: DeviceKeyStore, now?: number): DeviceProofVerificationResult;
export declare const verifyAdmissionProof: typeof validateAdmissionProof;
/**
 * Asserts that a proof is strictly valid, throwing on failure.
 */
export declare function assertValidAdmissionProof(challenge: DeviceChallenge, proof: DeviceProof | undefined, keyStore: DeviceKeyStore, now?: number): void;
