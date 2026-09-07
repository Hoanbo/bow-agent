// src/core/synchronization/syncTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.18: SYNCHRONIZATION DATA CONTRACTS
//
// EN:
// Type definitions for surface observations, surface acknowledgements, synchronization checkpoints,
// synchronization state, reconciliation results, and synchronization audit records.
//
// VI:
// Định nghĩa kiểu dữ liệu cho quan sát của bề mặt, xác nhận của bề mặt, checkpoint đồng bộ hóa,
// trạng thái đồng bộ hóa, kết quả hòa giải và bản ghi kiểm toán đồng bộ hóa.

import type { BrainEvent, ReconciliationClassification, SyncFailureCode } from './eventTypes.js';

export type { ReconciliationClassification, SyncFailureCode };

/**
 * EN: Record of a surface observing a published Brain event.
 * VI: Bản ghi một bề mặt đã quan sát một sự kiện Não bộ đã công bố.
 */
export interface SyncObservation {
  readonly surfaceId: string;
  readonly eventId: string;
  readonly sequence: number;
  readonly observedAt: number;
  readonly fingerprint: string;
}

/**
 * EN: Record of a surface acknowledging processing of an observed Brain event.
 * VI: Bản ghi một bề mặt đã xác nhận đã xử lý sự kiện Não bộ quan sát được.
 */
export interface SyncAcknowledgement {
  readonly surfaceId: string;
  readonly eventId: string;
  readonly sequence: number;
  readonly acknowledgedAt: number;
  readonly fingerprint: string;
}

/**
 * EN: Deterministic immutable synchronization checkpoint representing state at sequence N.
 * VI: Checkpoint đồng bộ hóa bất biến tất định biểu diễn trạng thái tại số thứ tự N.
 */
export interface SyncCheckpoint {
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly latestEventId: string;
  readonly latestEventFingerprint: string;
  readonly continuityId?: string;
  readonly activeSurfaces: readonly string[];
  readonly acknowledgedSurfaces: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly fingerprint: string;
  readonly timestamp: number;
}

/**
 * EN: Synchronization health classification.
 * VI: Phân loại tình trạng sức khỏe đồng bộ hóa.
 */
export type SyncHealth = 'HEALTHY' | 'STALE' | 'CONFLICTED' | 'GAP_DETECTED';

/**
 * EN: Authoritative snapshot of Brain synchronization state for a specific scope.
 * VI: Ảnh chụp có thẩm quyền về trạng thái đồng bộ hóa của Não bộ cho một phạm vi cụ thể.
 */
export interface SynchronizationState {
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly lastSequence: number;
  readonly latestEvent?: BrainEvent;
  readonly activeSurfaces: readonly string[];
  readonly surfaceObservations: Readonly<Record<string, readonly SyncObservation[]>>;
  readonly surfaceAcknowledgements: Readonly<Record<string, readonly SyncAcknowledgement[]>>;
  readonly latestCheckpoint?: SyncCheckpoint;
  readonly health: SyncHealth;
  readonly lastError?: {
    readonly code: SyncFailureCode;
    readonly reason: string;
    readonly timestamp: number;
  };
}

/**
 * EN: Result of reconciling incoming state against authoritative Brain state.
 * VI: Kết quả hòa giải trạng thái gửi đến so với trạng thái Não bộ có thẩm quyền.
 */
export interface ReconciliationResult {
  readonly classification: ReconciliationClassification;
  readonly brainSequence: number;
  readonly incomingSequence: number;
  readonly consistent: boolean;
  readonly reason: string;
  readonly conflictFingerprint?: string;
}

/**
 * EN: Immutable audit record for synchronization lifecycle operations.
 * VI: Bản ghi kiểm toán bất biến cho các thao tác vòng đời đồng bộ hóa.
 */
export interface SyncRecord {
  readonly syncId: string;
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly action: string;
  readonly surfaceId?: string;
  readonly eventId?: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}
