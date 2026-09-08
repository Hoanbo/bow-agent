import type { BrainId, BrainTaskResult } from '../brain/brainTypes.js';
import type { BrainTaskInput } from '../brain/brainTask.js';
export declare const BRAIN_SERVICE_VERSION = "4.0.0";
export declare const BRAIN_SERVICE_PROTOCOL_VERSION = "1.0.0";
export type BrainServiceId = `bsvc_${string}`;
export type BrainServiceMode = 'standalone' | 'embedded' | 'worker';
export type BrainHostMode = 'server' | 'workstation' | 'desktop';
export type BrainServiceHealthState = 'READY' | 'DEGRADED' | 'RECOVERING' | 'FAILED' | 'STOPPED';
export type BrainQueueStatus = 'IDLE' | 'PROCESSING' | 'BUSY' | 'BACKPRESSURE' | 'RECOVERING';
export type BrainFailureClassification = 'RECOVERABLE' | 'DEGRADED' | 'FATAL';
export interface BrainDeviceContext {
    readonly deviceId: string;
    readonly scope?: string;
    readonly role?: string;
    readonly trustTier?: string;
}
export interface BrainServiceRequestEnvelope {
    readonly requestId: string;
    readonly sessionId: string;
    readonly deviceContext: BrainDeviceContext;
    readonly timestamp: number;
    readonly input: BrainTaskInput;
    readonly metadata?: Record<string, unknown>;
}
export interface BrainServiceErrorDetail {
    readonly code: string;
    readonly message: string;
    readonly classification: BrainFailureClassification;
    readonly recoverable: boolean;
    readonly timestamp: number;
}
export interface BrainServiceResponseEnvelope {
    readonly requestId: string;
    readonly sessionId: string;
    readonly success: boolean;
    readonly result?: BrainTaskResult;
    readonly error?: BrainServiceErrorDetail;
    readonly health: BrainServiceHealthState;
    readonly queueStatus: BrainQueueStatus;
    readonly durationMs: number;
    readonly timestamp: number;
    readonly metadata?: Record<string, unknown>;
}
export interface BrainDurableServiceState {
    readonly version: string;
    readonly serviceId: BrainServiceId;
    readonly brainId: BrainId;
    readonly hostMode: BrainHostMode;
    readonly totalRequestsReceived: number;
    readonly totalRequestsCompleted: number;
    readonly totalRequestsFailed: number;
    readonly completedRequestIds: readonly string[];
    readonly lastCommittedAt: number;
    readonly lastShutdownAt?: number;
    readonly createdAt: number;
}
export type BrainServiceAuditEventType = 'SERVICE_BOOTSTRAP' | 'SERVICE_READY' | 'STATE_LOADED' | 'REQUEST_RECEIVED' | 'REQUEST_ACCEPTED' | 'REQUEST_EXECUTING' | 'REQUEST_COMPLETED' | 'REQUEST_FAILED' | 'REQUEST_IDEMPOTENT_HIT' | 'FAILURE_CLASSIFIED' | 'RECOVERY_INITIATED' | 'RECOVERY_COMPLETED' | 'PERSISTENCE_SAVED' | 'BACKPRESSURE_TRIGGERED' | 'SHUTDOWN_INITIATED' | 'SHUTDOWN_COMPLETED';
export interface BrainServiceAuditEvent {
    readonly eventId: string;
    readonly type: BrainServiceAuditEventType;
    readonly serviceId: BrainServiceId;
    readonly brainId: BrainId;
    readonly timestamp: number;
    readonly requestId?: string;
    readonly data?: Record<string, unknown>;
}
export interface BrainServiceMetrics {
    totalRequestsReceived: number;
    totalRequestsCompleted: number;
    totalRequestsFailed: number;
    totalIdempotentHits: number;
    totalRecoveries: number;
    consecutiveFailures: number;
    lastRequestLatencyMs: number;
    averageLatencyMs: number;
    uptimeMs: number;
    startedAt: number;
}
export interface BrainServiceHealthSnapshot {
    readonly version: string;
    readonly serviceId: BrainServiceId;
    readonly brainId: BrainId;
    readonly health: BrainServiceHealthState;
    readonly state: string;
    readonly queueStatus: BrainQueueStatus;
    readonly queueDepth: number;
    readonly metrics: BrainServiceMetrics;
    readonly persistenceHealthy: boolean;
    readonly runtimeHealthy: boolean;
    readonly timestamp: number;
}
/**
 * Deterministic, crypto-safe identifier generator.
 * Uses crypto SHA-256 hash to avoid forbidden Math.random.
 */
export declare function makeBrainServiceId(seed?: string): BrainServiceId;
export declare function makeAuditEventId(): string;
