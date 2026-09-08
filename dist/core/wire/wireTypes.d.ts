import type { SurfaceType } from '../coordination/coordinationStates.js';
import type { ScopedRelayIdentity } from '../relay/relayTypes.js';
export declare const WIRE_PROTOCOL_VERSION = "4.0.0";
/**
 * Surface type re-exported under a distinct identifier to prevent naming collisions.
 */
export type WireSurfaceType = SurfaceType;
/**
 * Transport implementation classification.
 * Strictly distinguishes real network I/O from test/in-memory simulation.
 */
export type WireTransportType = 'REAL_WEBSOCKET' | 'REAL_TCP' | 'TEST_IN_MEMORY';
/**
 * High-level frame categories on physical wire.
 */
export type WireFrameType = 'HANDSHAKE' | 'HANDSHAKE_ACK' | 'DATA' | 'HEARTBEAT' | 'HEARTBEAT_ACK' | 'BACKPRESSURE' | 'CLOSE';
/**
 * Governed message categories preserving semantic category across wire.
 */
export type WireMessageCategory = 'CONTROL' | 'REQUEST' | 'RESPONSE' | 'EVENT' | 'ACK' | 'HEARTBEAT' | 'ERROR';
/**
 * Risk classification levels preserved across transport routing.
 */
export type WireRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * Transmission priority levels.
 */
export type WireMessagePriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
/**
 * Backpressure buffer states.
 */
export type WireBackpressureLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'OVERFLOW';
/**
 * Heartbeat health classification.
 */
export type WireHeartbeatStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
/**
 * Transport-independent wire endpoint abstraction.
 * Physical network routing only. Knowing this endpoint NEVER grants access.
 */
export interface WireEndpointMetadata {
    readonly host: string;
    readonly port: number;
    readonly protocol: 'ws' | 'wss' | 'tcp' | 'tls' | 'test-in-memory';
    readonly path?: string;
    readonly tlsRequired: boolean;
    readonly isLocal: boolean;
}
/**
 * Physical framing boundary on the wire.
 * Enforces maximum size bounds and cryptographic payload checksums.
 */
export interface WireFrame {
    readonly frameId: string;
    readonly frameType: WireFrameType;
    readonly sequence: number;
    readonly payloadLength: number;
    readonly checksum: string;
    readonly timestamp: number;
    readonly payload: string;
}
/**
 * Canonical wire envelope carried inside a DATA WireFrame.
 * Strictly contains routing, identity, and sequence metadata.
 * FORBIDDEN: Private keys, passwords, credentials, LLM prompts, tool tokens, executable code.
 */
export interface WireEnvelope<T = unknown> {
    readonly wireVersion: string;
    readonly messageId: string;
    readonly sequence: number;
    readonly relayId: string;
    readonly brainId: string;
    readonly deviceId: string;
    readonly sessionId: string;
    readonly surfaceId: string;
    readonly surfaceType: WireSurfaceType;
    readonly scope: ScopedRelayIdentity;
    readonly messageCategory: WireMessageCategory;
    readonly priority: WireMessagePriority;
    readonly riskLevel: WireRiskLevel;
    readonly correlationId: string;
    readonly timestamp: number;
    readonly payload: T;
    readonly resumeToken?: string;
    readonly clientLastAckSeq?: number;
    readonly clientNextSeq?: number;
}
/**
 * Handshake initialization payload from client surface.
 */
export interface WireHandshakeRequest {
    readonly wireVersion: string;
    readonly clientNonce: string;
    readonly deviceId: string;
    readonly surfaceId: string;
    readonly surfaceType: WireSurfaceType;
    readonly timestamp: number;
    readonly clientCapabilities: readonly string[];
}
/**
 * Handshake acknowledgement and challenge issued by Relay Gateway.
 */
export interface WireHandshakeResponse {
    readonly accepted: boolean;
    readonly wireVersion: string;
    readonly gatewayNonce: string;
    readonly assignedConnectionId: string;
    readonly assignedSessionId?: string;
    readonly heartbeatIntervalMs: number;
    readonly maxFrameSize: number;
    readonly challenge?: string;
    readonly rejectionReason?: string;
}
/**
 * Wire connection operational performance metrics.
 */
export interface WireConnectionMetrics {
    readonly connectionId: string;
    readonly bytesSent: number;
    readonly bytesReceived: number;
    readonly framesSent: number;
    readonly framesReceived: number;
    readonly droppedFrames: number;
    readonly currentBackpressure: WireBackpressureLevel;
    readonly rttMs: number;
    readonly connectedAt: number;
    readonly lastActivityAt: number;
}
/**
 * Wire transport snapshot for monitoring and audit.
 */
export interface WireTransportSnapshot {
    readonly activeConnections: number;
    readonly totalBytesSent: number;
    readonly totalBytesReceived: number;
    readonly totalFramesSent: number;
    readonly totalFramesReceived: number;
    readonly totalReconnections: number;
    readonly totalResumptions: number;
    readonly totalDroppedFrames: number;
    readonly backpressureState: WireBackpressureLevel;
    readonly status: 'READY' | 'ACTIVE' | 'DEGRADED' | 'DRAINING' | 'CLOSED';
}
/**
 * Security audit event classifications for wire layer.
 */
export type WireSecurityEventType = 'WIRE_CONNECTION_OPENED' | 'WIRE_CONNECTION_CLOSED' | 'WIRE_HANDSHAKE_REQUESTED' | 'WIRE_HANDSHAKE_COMPLETED' | 'WIRE_HANDSHAKE_REJECTED' | 'WIRE_ADMISSION_REQUESTED' | 'WIRE_ADMISSION_GRANTED' | 'WIRE_ADMISSION_DENIED' | 'WIRE_SESSION_BOUND' | 'WIRE_SESSION_RESUMED' | 'WIRE_SESSION_RESUME_REJECTED' | 'WIRE_FRAME_SENT' | 'WIRE_FRAME_RECEIVED' | 'WIRE_FRAME_REJECTED' | 'WIRE_MALFORMED_FRAME' | 'WIRE_CHECKSUM_MISMATCH' | 'WIRE_SIZE_EXCEEDED' | 'WIRE_BACKPRESSURE_ELEVATED' | 'WIRE_BACKPRESSURE_OVERFLOW' | 'WIRE_RECONNECT_SCHEDULED' | 'WIRE_RECONNECT_SUCCEEDED' | 'WIRE_RECONNECT_FAILED' | 'WIRE_ROAMING_DETECTED' | 'WIRE_HEARTBEAT_MISSED' | 'WIRE_HEARTBEAT_RESTORED' | 'WIRE_ERROR_RECORDED';
/**
 * Append-only immutable wire audit record.
 */
export interface WireAuditRecord {
    readonly auditId: string;
    readonly eventType: WireSecurityEventType;
    readonly connectionId: string;
    readonly deviceId?: string;
    readonly sessionId?: string;
    readonly timestamp: number;
    readonly details: Record<string, unknown>;
    readonly riskLevel: WireRiskLevel;
}
