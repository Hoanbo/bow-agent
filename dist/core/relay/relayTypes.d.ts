import type { SurfaceType } from '../coordination/coordinationStates.js';
export declare const RELAY_PROTOCOL_VERSION = "4.0.0";
/**
 * Deterministic Relay Identifier brand
 */
export type RelayId = string;
/**
 * Supported client surface types connecting to the single Brain
 */
export type RelaySurfaceType = SurfaceType;
/**
 * 9-tuple ScopedRelayIdentity
 * Enforces strict isolation across all relay dimensions.
 */
export interface ScopedRelayIdentity {
    readonly tenantId: string;
    readonly userId: string;
    readonly deviceId: string;
    readonly relayId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly sessionId: string;
    readonly connectionId: string;
    readonly gatewayId: string;
}
/**
 * Transport-independent Relay Endpoint abstraction.
 * Routing information only. Knowing this endpoint NEVER grants access.
 */
export interface RelayEndpointMetadata {
    readonly host: string;
    readonly port: number;
    readonly protocol: 'wss' | 'https' | 'quic' | 'tls' | 'test-in-memory';
    readonly tlsRequired: boolean;
    readonly region?: string;
    readonly cluster?: string;
    readonly isLocal: boolean;
}
/**
 * Capabilities supported by the relay runtime
 */
export type RelayCapability = 'ROUTING' | 'MULTIPLEXING' | 'HEARTBEAT' | 'RESUME' | 'BACKPRESSURE' | 'ROAMING_SUPPORT' | 'TOKEN_ADMISSION';
/**
 * Operational status of a registered relay
 */
export type RelayStatus = 'ACTIVE' | 'DRAINING' | 'STANDBY' | 'SUSPENDED' | 'REVOKED';
/**
 * Explicit registration record of a Relay with Brain infrastructure
 */
export interface RelayRegistration {
    readonly relayId: RelayId;
    readonly advertisedEndpoint: RelayEndpointMetadata;
    readonly supportedProtocols: readonly string[];
    readonly capabilities: readonly RelayCapability[];
    readonly scope: {
        readonly brainId: string;
        readonly tenantId: string;
        readonly allowedSurfaces: readonly SurfaceType[];
    };
    readonly registeredAt: number;
    readonly status: RelayStatus;
    readonly publicKey?: string;
    readonly version: string;
}
/**
 * Relay message categories preserving non-cognitive intent
 */
export type RelayMessageCategory = 'CONTROL' | 'REQUEST' | 'RESPONSE' | 'EVENT' | 'ACK' | 'HEARTBEAT' | 'ERROR';
/**
 * Message transmission priority
 */
export type RelayMessagePriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
/**
 * Governed risk levels preserved during message routing
 */
export type RelayRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * Relay envelope encapsulating routed messages without reinterpretation
 */
export interface RelayMessage {
    readonly messageId: string;
    readonly category: RelayMessageCategory;
    readonly priority: RelayMessagePriority;
    readonly sessionId: string;
    readonly deviceId: string;
    readonly surfaceId: string;
    readonly surfaceType: SurfaceType;
    readonly relayId: RelayId;
    readonly brainId: string;
    readonly sequence: number;
    readonly timestamp: number;
    readonly payload: unknown;
    readonly riskLevel: RelayRiskLevel;
}
/**
 * Long-lived Remote Session abstraction
 */
export interface RemoteSession {
    readonly sessionId: string;
    readonly deviceId: string;
    readonly relayId: RelayId;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly surfaceType: SurfaceType;
    readonly tenantId: string;
    readonly userId: string;
    readonly connectionId: string;
    readonly gatewayId: string;
    readonly createdAt: number;
    readonly lastActivityAt: number;
    readonly resumedAt?: number;
    readonly state: RelaySessionState;
    readonly sequenceNumber: number;
    readonly ackSequenceNumber: number;
    readonly admissionState: 'PENDING' | 'ADMITTED' | 'REJECTED';
    readonly trustState: 'PENDING' | 'TRUSTED' | 'REVOKED';
    readonly resumeToken?: string;
}
/**
 * Canonical Relay and Remote Session lifecycle states
 */
export type RelaySessionState = 'DISCONNECTED' | 'DISCOVERING' | 'CONNECTING' | 'CONNECTED' | 'ADMISSION_PENDING' | 'ADMITTED' | 'SESSION_ESTABLISHING' | 'SESSION_ACTIVE' | 'DEGRADED' | 'RECONNECTING' | 'RESUMING' | 'SESSION_SUSPENDED' | 'TERMINATING' | 'TERMINATED' | 'REJECTED';
/**
 * Backpressure buffer states
 */
export type RelayBackpressureState = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'OVERFLOW';
/**
 * Heartbeat health classifications
 */
export type RelayHeartbeatStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
/**
 * Recorded heartbeat health snapshot
 */
export interface RelayHeartbeatRecord {
    readonly relayId: RelayId;
    readonly sessionId: string;
    readonly timestamp: number;
    readonly rttMs: number;
    readonly status: RelayHeartbeatStatus;
    readonly consecutiveMisses: number;
}
/**
 * Typed timeout categories
 */
export type RelayTimeoutCategory = 'CONNECTION' | 'REGISTRATION' | 'ADMISSION' | 'SESSION_ESTABLISHMENT' | 'HEARTBEAT' | 'RECONNECT' | 'RESUME' | 'ROUTING' | 'SHUTDOWN';
/**
 * Security audit event classifications
 */
export type RelaySecurityEventType = 'RELAY_DISCOVERED' | 'RELAY_REGISTERED' | 'RELAY_REJECTED' | 'CONNECTION_OPENED' | 'CONNECTION_CLOSED' | 'ADMISSION_STARTED' | 'ADMISSION_ACCEPTED' | 'ADMISSION_REJECTED' | 'SESSION_CREATED' | 'SESSION_RESUMED' | 'SESSION_SUSPENDED' | 'SESSION_TERMINATED' | 'HEARTBEAT_FAILED' | 'HEARTBEAT_RECOVERED' | 'ROAMING_DETECTED' | 'RECONNECT_STARTED' | 'RECONNECT_COMPLETED' | 'REPLAY_REJECTED' | 'SCOPE_REJECTED' | 'CAPABILITY_REJECTED' | 'BACKPRESSURE_OVERFLOW' | 'SEQUENCE_GAP_REJECTED' | 'SEQUENCE_REWIND_REJECTED' | 'SPOOF_REJECTED' | 'CLONE_REJECTED' | 'STALE_RESUME_REJECTED';
/**
 * Immutable audit log record
 */
export interface RelayAuditRecord {
    readonly id: string;
    readonly timestamp: number;
    readonly eventType: RelaySecurityEventType;
    readonly relayId?: RelayId;
    readonly deviceId?: string;
    readonly sessionId?: string;
    readonly surfaceId?: string;
    readonly surfaceType?: SurfaceType;
    readonly details: Record<string, unknown>;
}
/**
 * Overall runtime diagnostic snapshot
 */
export interface RelayRuntimeSnapshot {
    readonly protocolVersion: string;
    readonly registeredRelaysCount: number;
    readonly activeSessionsCount: number;
    readonly backpressureState: RelayBackpressureState;
    readonly totalMessagesRouted: number;
    readonly totalReconnections: number;
    readonly totalResumptions: number;
    readonly totalRoamingEvents: number;
    readonly totalSecurityEvents: number;
    readonly healthy: boolean;
}
