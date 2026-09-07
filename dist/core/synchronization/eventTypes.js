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
export const ALL_BRAIN_EVENT_TYPES = Object.freeze(new Set([
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
]));
export const ALL_EVENT_SOURCES = Object.freeze(new Set([
    'BRAIN',
    'LIFECYCLE',
    'VERIFICATION',
    'COMMIT',
    'RECOVERY',
    'COORDINATION',
    'SURFACE',
]));
