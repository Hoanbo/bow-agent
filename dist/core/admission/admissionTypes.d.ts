import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { ScopedConnectionIdentity } from '../connection/connectionTypes.js';
import type { DeviceChallenge, DeviceProof } from '../deviceIdentity/persistentDeviceTypes.js';
export declare const ADMISSION_PROTOCOL_VERSION = "4.0.0";
/**
 * Observed network type classifications.
 * Transport-level metadata ONLY. Never used as device or user identity.
 */
export type NetworkType = 'WIFI' | 'CELLULAR_4G' | 'CELLULAR_5G' | 'WIRED' | 'HOTSPOT' | 'REMOTE_INTERNET' | 'UNKNOWN';
export declare const ALL_NETWORK_TYPES: readonly NetworkType[];
/**
 * Network locality classification.
 * Informational only; LOCAL network is treated as hostile as public INTERNET.
 */
export type NetworkLocality = 'LOCAL' | 'REMOTE' | 'UNKNOWN';
/**
 * Network metadata captured for an incoming admission request.
 * Invariant: NETWORK_LOCATION IS TRANSPORT INFORMATION.
 * MUST NOT be used as user identity, device identity, trust identity, authorization, or execution authority.
 */
export interface NetworkMetadata {
    readonly networkType: NetworkType;
    readonly ipAddress: string;
    readonly ssid?: string;
    readonly locality: NetworkLocality;
    readonly isRoaming: boolean;
    readonly transportType: string;
    readonly interfaceName?: string;
}
/**
 * Endpoint metadata representing the connection target.
 * Invariant: KNOWING_BRAIN_ENDPOINT != ACCESS_TO_BRAIN.
 */
export interface EndpointMetadata {
    readonly host: string;
    readonly port: number;
    readonly protocol: string;
    readonly tlsEnabled: boolean;
    readonly path?: string;
}
/**
 * Canonical admission decision types.
 */
export type AdmissionDecisionType = 'ADMIT' | 'REJECT' | 'CHALLENGE_REQUIRED' | 'REAUTHENTICATION_REQUIRED' | 'SESSION_RESUME_REQUIRED' | 'REVOKED' | 'EXPIRED' | 'SCOPE_MISMATCH' | 'CAPABILITY_REJECTED';
export declare const ALL_ADMISSION_DECISION_TYPES: readonly AdmissionDecisionType[];
/**
 * Specific typed reasons for admission rejection.
 */
export type AdmissionRejectionReason = 'UNTRUSTED_NETWORK_REJECTED' | 'INVALID_PROOF' | 'REPLAY_DETECTED' | 'DEVICE_REVOKED' | 'KEY_REVOKED' | 'TRUST_EXPIRED' | 'SCOPE_MISMATCH' | 'FORBIDDEN_CAPABILITY' | 'INVALID_ENDPOINT' | 'UNKNOWN_DEVICE' | 'DEVICE_NOT_TRUSTED' | 'CAPABILITY_REJECTED' | 'SESSION_TERMINATED' | 'TAMPER_DETECTED' | 'CROSS_TENANT_ACCESS' | 'RECONNECT_REEXECUTE_PREVENTED' | 'MALFORMED_REQUEST' | 'PROTOCOL_VERSION_MISMATCH';
export declare const ALL_ADMISSION_REJECTION_REASONS: readonly AdmissionRejectionReason[];
/**
 * Authoritative Admission Request contract.
 */
export interface AdmissionRequest {
    readonly requestId: string;
    readonly deviceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly connectionScope?: ScopedConnectionIdentity;
    readonly network: NetworkMetadata;
    readonly endpoint: EndpointMetadata;
    readonly protocolVersion: string;
    readonly requestedCapabilities: readonly string[];
    readonly challengeId?: string;
    readonly proof?: DeviceProof;
    readonly sessionId?: string;
    readonly timestamp: number;
}
/**
 * Authoritative Admission Decision contract.
 * Immutable envelope representing fail-closed admission outcome.
 */
export interface AdmissionDecision {
    readonly decisionId: string;
    readonly requestId: string;
    readonly decision: AdmissionDecisionType;
    readonly admitted: boolean;
    readonly deviceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly assignedSessionId?: string;
    readonly session?: {
        readonly sessionId: string;
    };
    readonly allowedCapabilities: readonly string[];
    readonly rejectedCapabilities: readonly string[];
    readonly rejectionReason?: AdmissionRejectionReason;
    readonly rejectionDetails?: string;
    readonly challenge?: DeviceChallenge;
    readonly network: NetworkMetadata;
    readonly timestamp: number;
    readonly decisionFingerprint: string;
}
/**
 * Observational security events emitted by AdmissionAudit.
 */
export type AdmissionSecurityEventType = 'ADMISSION_REQUESTED' | 'ADMISSION_ADMITTED' | 'ADMISSION_REJECTED' | 'CHALLENGE_ISSUED' | 'PROOF_VERIFIED' | 'REPLAY_ATTACK_BLOCKED' | 'REVOKED_DEVICE_BLOCKED' | 'EXPIRED_TRUST_BLOCKED' | 'SCOPE_MISMATCH_BLOCKED' | 'CAPABILITY_ESCALATION_BLOCKED' | 'ROAMING_MIGRATION_OBSERVED' | 'SESSION_RESUMED' | 'RECONNECT_REEXECUTE_PREVENTED' | 'UNAUTHORIZED_ENDPOINT_PROBE';
export declare const ALL_ADMISSION_SECURITY_EVENT_TYPES: readonly AdmissionSecurityEventType[];
/**
 * Observational snapshot for AgentLoop context and telemetry.
 */
export interface ZeroTrustAdmissionSnapshot {
    readonly protocolVersion: string;
    readonly totalAdmissionsEvaluated: number;
    readonly totalAdmitted: number;
    readonly totalRejected: number;
    readonly activeSessionsCount: number;
    readonly activeChallengesCount: number;
    readonly roamingTransitionsCount: number;
    readonly state: string;
    readonly timestamp: number;
}
