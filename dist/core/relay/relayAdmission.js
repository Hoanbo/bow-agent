// src/core/relay/relayAdmission.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Zero-Trust Admission Integration for Relay Connectivity.
//
// INVARIANTS:
// - RELAY_CONNECTED != DEVICE_ADMITTED
// - RELAY_CONNECTED != AUTHENTICATED
// - RELAY_CONNECTED != TRUSTED
// - Relay does NOT replace ZeroTrustAdmissionRuntime.
// - Topology: Network -> Relay -> ZeroTrustAdmissionRuntime -> Device Trust -> Session -> Brain
import { ZeroTrustAdmissionRuntime } from '../admission/admissionRuntime.js';
export class RelayAdmissionError extends Error {
    constructor(message) {
        super(`RELAY_ADMISSION_ERROR: ${message}`);
        this.name = 'RelayAdmissionError';
    }
}
import { createDeviceProof } from '../deviceIdentity/persistentDeviceProof.js';
/**
 * Bridge between incoming Relay traffic and the authoritative MS-1.3.26 ZeroTrustAdmissionRuntime.
 */
export class RelayAdmissionBridge {
    admissionRuntime;
    constructor(admissionRuntime) {
        this.admissionRuntime = admissionRuntime ?? new ZeroTrustAdmissionRuntime();
    }
    getAdmissionRuntime() {
        return this.admissionRuntime;
    }
    /**
     * Evaluates admission for a device connecting via a relay.
     * Maps relay parameters into canonical AdmissionRequest.
     */
    evaluateRelayAdmission(params, now = Date.now()) {
        const netType = params.networkContext.networkType === 'CELLULAR_4G'
            ? 'CELLULAR_4G'
            : params.networkContext.networkType === 'CELLULAR_5G'
                ? 'CELLULAR_5G'
                : params.networkContext.networkType === 'HOTSPOT'
                    ? 'HOTSPOT'
                    : params.networkContext.networkType === 'ETHERNET'
                        ? 'WIRED'
                        : 'WIFI';
        const admissionReq = {
            requestId: `adm_relay_${now}_${params.deviceId}`,
            deviceId: params.deviceId,
            scope: {
                userId: params.scope.userId,
                sessionId: params.sessionId || `sess_${now}`,
                brainId: params.scope.brainId,
                surfaceId: params.scope.surfaceId,
                transportId: 'transport_relay_v4',
                gatewayId: 'gw_relay_v4',
                adapterId: 'adapter_relay_v4',
                connectionId: `conn_relay_${now}`,
                deviceId: params.deviceId,
            },
            connectionScope: {
                userId: params.scope.userId,
                sessionId: params.sessionId || `sess_${now}`,
                brainId: params.scope.brainId,
                surfaceId: params.scope.surfaceId,
                transportId: 'transport_relay_v4',
                gatewayId: 'gw_relay_v4',
                adapterId: 'adapter_relay_v4',
                connectionId: `conn_relay_${now}`,
            },
            network: {
                networkType: netType,
                ipAddress: params.networkContext.ipAddress,
                ssid: params.networkContext.ssid,
                locality: params.endpoint.isLocal ? 'LOCAL' : 'REMOTE',
                isRoaming: false,
                transportType: 'relay',
            },
            endpoint: {
                host: params.endpoint.host,
                port: params.endpoint.port,
                protocol: params.endpoint.protocol === 'test-in-memory' ? 'wss' : params.endpoint.protocol,
                tlsEnabled: params.endpoint.tlsRequired,
            },
            protocolVersion: '4.0.0',
            requestedCapabilities: ['CONNECTIVITY', 'TELEMETRY'],
            challengeId: params.proof?.challengeId,
            proof: params.proof,
            sessionId: params.isResume ? params.sessionId : undefined,
            timestamp: now,
        };
        return this.admissionRuntime.evaluateAdmission(admissionReq, now);
    }
    /**
     * Solves an issued challenge by signing it with the enrolled device key from keyStore,
     * then re-evaluates admission with the generated DeviceProof.
     */
    solveChallengeAndAdmit(params, challenge, keyId, now = Date.now()) {
        const keyStore = this.admissionRuntime.getKeyStore();
        const key = keyId ? keyStore.getKey(keyId) : keyStore.listKeys(params.deviceId)[0];
        if (!key) {
            throw new RelayAdmissionError(`No enrolled cryptographic key found for device ${params.deviceId}`);
        }
        const proof = createDeviceProof({
            challenge,
            keyStore,
            keyId: key.keyId,
            timestamp: now,
        });
        return this.evaluateRelayAdmission({ ...params, proof }, now);
    }
    /**
     * Asserts that a device admission decision is an explicit permit.
     * Fails closed if not admitted.
     */
    assertDeviceAdmitted(decision) {
        if (decision.decision !== 'ADMIT' || !decision.admitted) {
            throw new RelayAdmissionError(`ADMISSION_DENIED: Device admission through relay failed with decision: ${decision.decision}, reason: ${decision.rejectionReason}`);
        }
    }
}
