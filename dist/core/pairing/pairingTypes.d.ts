export declare const PAIRING_PROTOCOL_VERSION = "4.0.0";
/**
 * Explicit device / surface categories.
 * Extensible for future surfaces without breaking backward compatibility.
 */
export type DeviceType = 'BOW-MOBILE' | 'BOW-ROBOT' | 'DESKTOP' | 'WEB' | 'VOICE';
export declare const SUPPORTED_DEVICE_TYPES: readonly DeviceType[];
/**
 * 10 Canonical Pairing States forming the authoritative finite-state machine.
 */
export type PairingState = 'UNPAIRED' | 'PAIRING_REQUESTED' | 'PAIRING_PENDING' | 'PAIRING_CONFIRMED' | 'PAIRED' | 'TRUSTED' | 'REVOKED' | 'EXPIRED' | 'REJECTED' | 'FAILED';
export declare const ALL_PAIRING_STATES: readonly PairingState[];
/**
 * Explicit Device Trust Levels.
 * Trust level never implies execution or cognitive authority.
 */
export type DeviceTrustLevel = 'NONE' | 'PAIRED' | 'TRUSTED' | 'REVOKED' | 'LIMITED' | 'SUSPENDED';
export declare const ALL_TRUST_LEVELS: readonly DeviceTrustLevel[];
/**
 * 9-tuple ScopedDeviceIdentity.
 * Preserves the 8 dimensions from ConnectionRuntime and extends with deviceId.
 */
export interface ScopedDeviceIdentity {
    readonly userId: string;
    readonly sessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly gatewayId: string;
    readonly adapterId: string;
    readonly connectionId: string;
    readonly deviceId: string;
}
/**
 * Safe, strictly non-cognitive device capabilities.
 */
export type SafeDeviceCapability = 'REQUEST_SCREEN_CAPTURE' | 'REQUEST_ROBOT_STATUS' | 'RECEIVE_EVENTS' | 'RECEIVE_SCREEN_RESULT' | 'RECEIVE_ROBOT_TELEMETRY';
export declare const SAFE_DEVICE_CAPABILITIES: readonly SafeDeviceCapability[];
/**
 * Forbidden cognitive / execution escalation capabilities.
 * If any of these are requested in a pairing flow, pairing must fail closed.
 */
export declare const PAIRING_FORBIDDEN_CAPABILITIES: readonly string[];
/**
 * Canonical Pairing Outcomes.
 */
export type PairingOutcome = 'PAIRING_ACCEPTED' | 'PAIRING_REJECTED' | 'PAIRING_PENDING' | 'PAIRING_EXPIRED' | 'PAIRING_REVOKED' | 'PAIRING_SCOPE_MISMATCH' | 'PAIRING_PROTOCOL_MISMATCH' | 'PAIRING_CAPABILITY_REJECTED';
/**
 * Canonical PairingRequest contract.
 */
export interface PairingRequest {
    readonly protocolVersion: string;
    readonly deviceId: string;
    readonly deviceType: DeviceType;
    readonly surfaceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly capabilities: readonly SafeDeviceCapability[];
    readonly deviceFingerprint: string;
    readonly requestedTrustLevel: DeviceTrustLevel;
    readonly pairingFingerprint: string;
    readonly sequence: number;
    readonly nonce: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Canonical PairingResponse contract.
 */
export interface PairingResponse {
    readonly outcome: PairingOutcome;
    readonly pairingId: string;
    readonly deviceId: string;
    readonly pairingState: PairingState;
    readonly trustLevel: DeviceTrustLevel;
    readonly protocolVersion: string;
    readonly scope: ScopedDeviceIdentity;
    readonly responseFingerprint: string;
    readonly message?: string;
    readonly sequence: number;
    readonly timestamp: number;
}
/**
 * Immutable PairingRecord stored logically in the pairing registry.
 */
export interface PairingRecord {
    readonly pairingId: string;
    readonly deviceId: string;
    readonly deviceType: DeviceType;
    readonly surfaceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly scopeString: string;
    readonly pairingState: PairingState;
    readonly trustLevel: DeviceTrustLevel;
    readonly protocolVersion: string;
    readonly capabilities: readonly SafeDeviceCapability[];
    readonly capabilityFingerprint: string;
    readonly deviceFingerprint: string;
    readonly pairingFingerprint: string;
    readonly confirmed: boolean;
    readonly confirmedBy?: string;
    readonly confirmedAt?: number;
    readonly revoked: boolean;
    readonly revokedBy?: string;
    readonly revokedReason?: string;
    readonly revokedAt?: number;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Immutable TrustRecord stored logically in the trust registry.
 */
export interface TrustRecord {
    readonly trustId: string;
    readonly deviceId: string;
    readonly pairingId: string;
    readonly scopeString: string;
    readonly trustLevel: DeviceTrustLevel;
    readonly capabilityFingerprint: string;
    readonly trustFingerprint: string;
    readonly active: boolean;
    readonly grantedAt: number;
    readonly revokedAt?: number;
    readonly revocationReason?: string;
}
/**
 * Canonical Pairing Audit Event Types.
 */
export type PairingAuditEventType = 'PAIRING_REQUESTED' | 'PAIRING_ACCEPTED' | 'PAIRING_REJECTED' | 'PAIRING_CONFIRMED' | 'PAIRING_COMPLETED' | 'DEVICE_RECOGNIZED' | 'TRUST_GRANTED' | 'TRUST_REVOKED' | 'REPAIR_REQUESTED' | 'REPLAY_REJECTED' | 'SCOPE_MISMATCH' | 'CAPABILITY_REJECTED' | 'PROTOCOL_MISMATCH' | 'STATE_TRANSITION';
/**
 * Immutable Pairing Audit Record.
 */
export interface PairingAuditRecord {
    readonly auditId: string;
    readonly eventType: PairingAuditEventType;
    readonly deviceId: string;
    readonly pairingId?: string;
    readonly scopeString: string;
    readonly pairingState?: PairingState;
    readonly trustLevel?: DeviceTrustLevel;
    readonly details: Readonly<Record<string, unknown>>;
    readonly auditFingerprint: string;
    readonly timestamp: number;
}
/**
 * 16 Authoritative Pairing Error Codes.
 */
export type PairingErrorCode = 'PAIRING_INVALID_REQUEST' | 'PAIRING_SCOPE_MISMATCH' | 'PAIRING_DEVICE_MISMATCH' | 'PAIRING_PROTOCOL_MISMATCH' | 'PAIRING_ALREADY_PAIRED' | 'PAIRING_NOT_FOUND' | 'PAIRING_NOT_CONFIRMABLE' | 'PAIRING_REJECTED' | 'PAIRING_REVOKED' | 'PAIRING_EXPIRED' | 'PAIRING_REPLAY' | 'PAIRING_MUTATED_REPLAY' | 'PAIRING_CAPABILITY_REJECTED' | 'PAIRING_TRUST_REQUIRED' | 'PAIRING_TRUST_REVOKED' | 'PAIRING_INVALID_TRANSITION';
