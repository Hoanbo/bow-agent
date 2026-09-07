// src/core/synchronization/eventTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.18: BRAIN EVENT & SYNCHRONIZATION TYPES
//
// EN:
// Authoritative event taxonomy, source enumerations, ordering classifications,
// reconciliation categories, failure codes, and canonical Brain Event Envelope contract.
//
// VI:
// Phân loại sự kiện có thẩm quyền, định danh nguồn sự kiện, phân loại thứ tự,
// danh mục hòa giải, mã lỗi, và hợp đồng phong bì sự kiện Não bộ (Brain Event Envelope) chuẩn mực.

import type { PlanRiskLevel } from '../planning/planningTypes.js';

export type { PlanRiskLevel };

/**
 * EN: Authoritative Brain event taxonomy.
 * VI: Phân loại sự kiện Não bộ có thẩm quyền.
 */
export type BrainEventType =
  | 'BRAIN_INITIALIZED'
  | 'BRAIN_STATE_CHANGED'
  | 'CONTEXT_UPDATED'
  | 'INTENT_UPDATED'
  | 'PLAN_UPDATED'
  | 'DECISION_UPDATED'
  | 'ORCHESTRATION_UPDATED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_FINISHED'
  | 'VERIFICATION_UPDATED'
  | 'COMMIT_STARTED'
  | 'COMMIT_COMPLETED'
  | 'RECOVERY_STARTED'
  | 'RECOVERY_COMPLETED'
  | 'LIFECYCLE_CHANGED'
  | 'SURFACE_REGISTERED'
  | 'SURFACE_ATTACHED'
  | 'SURFACE_AVAILABLE'
  | 'SURFACE_ACTIVE'
  | 'SURFACE_IDLE'
  | 'SURFACE_UNAVAILABLE'
  | 'SURFACE_DETACHED'
  | 'HANDOFF_CREATED'
  | 'HANDOFF_ACCEPTED'
  | 'HANDOFF_REJECTED'
  | 'SYNC_CHECKPOINT_CREATED'
  | 'SYNC_ACKNOWLEDGED'
  | 'SYNC_REJECTED'
  | 'SYNC_CONFLICT'
  | 'SYNC_STALE'
  | 'BRAIN_READY';

export const ALL_BRAIN_EVENT_TYPES: ReadonlySet<BrainEventType> = Object.freeze(
  new Set<BrainEventType>([
    'BRAIN_INITIALIZED',
    'BRAIN_STATE_CHANGED',
    'CONTEXT_UPDATED',
    'INTENT_UPDATED',
    'PLAN_UPDATED',
    'DECISION_UPDATED',
    'ORCHESTRATION_UPDATED',
    'EXECUTION_STARTED',
    'EXECUTION_FINISHED',
    'VERIFICATION_UPDATED',
    'COMMIT_STARTED',
    'COMMIT_COMPLETED',
    'RECOVERY_STARTED',
    'RECOVERY_COMPLETED',
    'LIFECYCLE_CHANGED',
    'SURFACE_REGISTERED',
    'SURFACE_ATTACHED',
    'SURFACE_AVAILABLE',
    'SURFACE_ACTIVE',
    'SURFACE_IDLE',
    'SURFACE_UNAVAILABLE',
    'SURFACE_DETACHED',
    'HANDOFF_CREATED',
    'HANDOFF_ACCEPTED',
    'HANDOFF_REJECTED',
    'SYNC_CHECKPOINT_CREATED',
    'SYNC_ACKNOWLEDGED',
    'SYNC_REJECTED',
    'SYNC_CONFLICT',
    'SYNC_STALE',
    'BRAIN_READY',
  ]),
);

/**
 * EN: Authoritative origin / emitter of an event.
 * VI: Nguồn phát sinh sự kiện có thẩm quyền.
 */
export type EventSource =
  | 'BRAIN'
  | 'LIFECYCLE'
  | 'VERIFICATION'
  | 'COMMIT'
  | 'RECOVERY'
  | 'COORDINATION'
  | 'SURFACE';

export const ALL_EVENT_SOURCES: ReadonlySet<EventSource> = Object.freeze(
  new Set<EventSource>([
    'BRAIN',
    'LIFECYCLE',
    'VERIFICATION',
    'COMMIT',
    'RECOVERY',
    'COORDINATION',
    'SURFACE',
  ]),
);

/**
 * EN: Event ordering analysis result against authoritative Brain timeline.
 * VI: Kết quả phân tích thứ tự sự kiện so với dòng thời gian Não bộ có thẩm quyền.
 */
export type EventOrderingClassification =
  | 'VALID_NEXT_EVENT'
  | 'DUPLICATE_EVENT'
  | 'STALE_EVENT'
  | 'SEQUENCE_GAP'
  | 'CONFLICTING_EVENT'
  | 'CROSS_SCOPE_EVENT'
  | 'INVALID_EVENT';

/**
 * EN: State reconciliation outcomes between Brain authoritative state and incoming surface/external state.
 * VI: Kết quả hòa giải trạng thái giữa Não bộ có thẩm quyền và trạng thái bề mặt/bên ngoài gửi tới.
 */
export type ReconciliationClassification =
  | 'CONSISTENT'
  | 'STALE'
  | 'DIVERGED'
  | 'CONFLICT'
  | 'GAP'
  | 'CROSS_SCOPE'
  | 'UNKNOWN';

/**
 * EN: Canonical error / rejection codes for synchronization failures.
 * VI: Mã lỗi / từ chối chuẩn mực cho các thất bại đồng bộ hóa.
 */
export type SyncFailureCode =
  | 'INVALID_EVENT'
  | 'INVALID_SCOPE'
  | 'STALE_EVENT'
  | 'DUPLICATE_EVENT'
  | 'SEQUENCE_GAP'
  | 'EVENT_CONFLICT'
  | 'BRAIN_CONFLICT'
  | 'SURFACE_CONFLICT'
  | 'RISK_DOWNGRADE'
  | 'GOVERNANCE_MISMATCH'
  | 'CHECKPOINT_MISMATCH'
  | 'RECONCILIATION_FAILURE';

/**
 * EN: Canonical immutable Brain Event Envelope contract.
 * VI: Hợp đồng phong bì sự kiện Não bộ (Brain Event Envelope) bất biến chuẩn mực.
 */
export interface BrainEvent {
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly eventId: string;
  readonly eventType: BrainEventType;
  readonly sequence: number;
  readonly previousSequence: number;
  readonly correlationId: string;
  readonly causationId: string;
  readonly source: EventSource;
  readonly targetSurfaceId?: string;
  readonly lifecycleState?: string;
  readonly riskLevel?: PlanRiskLevel;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Parameters to construct a BrainEvent envelope.
 * VI: Các tham số để tạo phong bì BrainEvent.
 */
export interface CreateBrainEventParams {
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly eventType: BrainEventType;
  readonly sequence: number;
  readonly previousSequence?: number;
  readonly correlationId: string;
  readonly causationId: string;
  readonly source: EventSource;
  readonly targetSurfaceId?: string;
  readonly lifecycleState?: string;
  readonly riskLevel?: PlanRiskLevel;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly timestamp?: number;
}
