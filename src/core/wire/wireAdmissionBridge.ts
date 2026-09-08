// src/core/wire/wireAdmissionBridge.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Zero-Trust Admission & Device Vault Integration Bridge for Wire Transport.
//
// INVARIANTS:
// - WIRE_TRANSPORT does not store private keys.
// - POSSESSING_DEVICE_ID != POSSESSING_DEVICE_KEY
// - POSSESSING_DEVICE_KEY != EXECUTION_AUTHORITY
// - RELAY_CONNECTED != DEVICE_ADMITTED
// - CONNECTED != ADMITTED

import type { DeviceProof, DeviceChallenge } from '../deviceIdentity/persistentDeviceTypes.js';
import type {
  AdmissionRequest,
  AdmissionDecision,
  NetworkType,
  EndpointMetadata,
  NetworkMetadata,
} from '../admission/admissionTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { ZeroTrustAdmissionRuntime } from '../admission/admissionRuntime.js';
import { DeviceVaultRuntime } from '../deviceVault/deviceVaultRuntime.js';
import { createDeviceProof } from '../deviceIdentity/persistentDeviceProof.js';
import { WireTransportError } from './wireFailure.js';

export interface WireAdmissionBridgeOptions {
  readonly admissionRuntime?: ZeroTrustAdmissionRuntime;
  readonly deviceVaultRuntime?: DeviceVaultRuntime;
}

export class WireAdmissionBridge {
  private readonly admissionRuntime: ZeroTrustAdmissionRuntime;
  private readonly deviceVaultRuntime: DeviceVaultRuntime;

  constructor(options?: WireAdmissionBridgeOptions) {
    this.admissionRuntime = options?.admissionRuntime ?? new ZeroTrustAdmissionRuntime();
    this.deviceVaultRuntime = options?.deviceVaultRuntime ?? new DeviceVaultRuntime();
  }

  public getAdmissionRuntime(): ZeroTrustAdmissionRuntime {
    return this.admissionRuntime;
  }

  public getDeviceVaultRuntime(): DeviceVaultRuntime {
    return this.deviceVaultRuntime;
  }

  /**
   * Client-Side: Generates a cryptographic DeviceProof solving the gateway challenge
   * using the local DeviceKeyStore without exposing the raw private key.
   */
  public generateProofForChallenge(
    deviceId: string,
    challengeToken: string,
    keyId?: string
  ): DeviceProof {
    const keyStore = this.admissionRuntime.getKeyStore();
    const key = keyId
      ? keyStore.getKey(keyId)
      : keyStore.getKeyForDevice(deviceId) ?? keyStore.listKeys(deviceId)[0];

    if (!key) {
      throw new WireTransportError(
        'WIRE_AUTHENTICATION_FAILED',
        `No enrolled cryptographic key found for device "${deviceId}" in vault. Cannot generate proof.`
      );
    }

    // Retrieve active challenge record from challenge tracker if available, or build envelope
    const challengeTracker = this.admissionRuntime.getChallengeTracker();
    const existingChallenge = challengeTracker.getChallenge(challengeToken);

    const challengeObj: DeviceChallenge = existingChallenge ?? Object.freeze({
      challengeId: challengeToken,
      deviceId,
      scope: {
        userId: 'usr_owner_01',
        sessionId: `sess_${deviceId}`,
        brainId: 'brain_authoritative_01',
        surfaceId: 'surf_01',
        transportId: 'transport_relay_v4',
        gatewayId: 'gw_relay_v4',
        adapterId: 'adapter_wire_v4',
        connectionId: 'conn_wire_01',
        deviceId,
      },
      scopeString: `scope::${deviceId}`,
      nonce: challengeToken.slice(0, 16),
      keyVersion: key.keyVersion,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60000,
      protocolVersion: '4.0.0',
      challengeFingerprint: challengeToken,
    });

    return createDeviceProof({
      challenge: challengeObj,
      keyStore,
      keyId: key.keyId,
    });
  }

  /**
   * Gateway/Server-Side: Evaluates admission for an incoming wire connection.
   */
  public async evaluateWireAdmission(params: {
    deviceId: string;
    surfaceType: string;
    surfaceId: string;
    scope: ScopedDeviceIdentity;
    endpoint: EndpointMetadata;
    network: NetworkMetadata;
    proof?: DeviceProof;
    sessionId?: string;
    isResume?: boolean;
  }): Promise<AdmissionDecision> {
    const req: AdmissionRequest = Object.freeze({
      requestId: `adm_wire_${Date.now()}`,
      deviceId: params.deviceId,
      scope: params.scope,
      connectionScope: {
        userId: params.scope.userId,
        sessionId: params.sessionId ?? params.scope.sessionId,
        brainId: params.scope.brainId,
        surfaceId: params.scope.surfaceId,
        transportId: params.scope.transportId,
        gatewayId: params.scope.gatewayId,
        adapterId: params.scope.adapterId,
        connectionId: params.scope.connectionId,
      },
      network: params.network,
      endpoint: params.endpoint,
      protocolVersion: '4.0.0',
      requestedCapabilities: ['CONNECTIVITY', 'TELEMETRY'],
      challengeId: params.proof?.challengeId,
      proof: params.proof,
      sessionId: params.isResume ? params.sessionId : undefined,
      timestamp: Date.now(),
    });

    const decision = await this.admissionRuntime.evaluateAdmission(req);

    if (decision.decision !== 'ADMIT' || !decision.admitted) {
      throw new WireTransportError(
        'WIRE_ADMISSION_FAILED',
        `Admission denied by ZeroTrustAdmissionRuntime: decision=${decision.decision}, reason=${decision.rejectionReason ?? 'DENIED'}`
      );
    }

    return decision;
  }
}
