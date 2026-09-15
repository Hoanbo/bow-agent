// src/core/federatedCollaborationMemory/federatedCollaborationMemoryTypes.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1118 — REAL
//
// EN: Canonical domain types, error taxonomy, lifecycle states, and deterministic provenance helpers
//     for native governed federated collaboration memory, shared context, and consensus.
// VI: Các kiểu miền chuẩn, phân loại lỗi, trạng thái vòng đời, và các hàm băm nguồn gốc xác định
//     cho bộ nhớ hợp tác liên đoàn có quản trị, ngữ cảnh chia sẻ, và đồng thuận tác tử.
import { createHash } from 'crypto';
// ----------------------------------------------------------------------------
// CONSTANTS AND HARD CEILINGS
// ----------------------------------------------------------------------------
export const MAX_CONSENSUS_PARTICIPANTS = 8;
export const MAX_ACTIVE_CONSENSUS_SESSIONS = 3;
export const MAX_CONSENSUS_ROUNDS = 10;
export const MAX_CONSENSUS_PROPOSALS = 20;
export const MAX_CONSENSUS_DURATION_MS = 3600000; // 1 hour
export const MAX_CONSENSUS_REASSESSMENTS = 5;
export const MAX_CONSECUTIVE_CONSENSUS_FAILURES = 3;
export const MAX_MEMORY_ENTRIES_PER_FEDERATION = 500;
export const MAX_MEMORY_ENTRIES_PER_AGENT = 100;
export const MAX_CONTEXT_SIZE = 1000;
export const MAX_OBSERVATIONS_PER_CONSENSUS = 50;
export const MAX_PROPOSALS_PER_CONTEXT = 20;
// ----------------------------------------------------------------------------
// TYPED ERRORS
// ----------------------------------------------------------------------------
export class FederatedCollaborationMemoryError extends Error {
    tenantId;
    contextId;
    constructor(message, tenantId, contextId) {
        super(message);
        this.name = 'FederatedCollaborationMemoryError';
        this.tenantId = tenantId;
        this.contextId = contextId;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class FederatedCollaborationMemoryValidationError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryValidationError';
    }
}
export class FederatedCollaborationMemoryTenantIsolationError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryTenantIsolationError';
    }
}
export class FederatedCollaborationMemorySessionIsolationError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemorySessionIsolationError';
    }
}
export class FederatedCollaborationMemoryAuthorizationError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryAuthorizationError';
    }
}
export class FederatedCollaborationMemoryLeaseError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryLeaseError';
    }
}
export class FederatedCollaborationMemoryBudgetError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryBudgetError';
    }
}
export class FederatedCollaborationMemoryConflictError extends FederatedCollaborationMemoryError {
    conflictCategory;
    constructor(message, conflictCategory, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryConflictError';
        this.conflictCategory = conflictCategory;
    }
}
export class FederatedCollaborationMemoryTrustError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryTrustError';
    }
}
export class FederatedCollaborationMemoryConcurrencyError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryConcurrencyError';
    }
}
export class FederatedCollaborationMemoryUserStopError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryUserStopError';
    }
}
export class FederatedCollaborationMemoryEmergencyStopError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryEmergencyStopError';
    }
}
export class FederatedCollaborationMemoryPersistenceError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryPersistenceError';
    }
}
export class FederatedCollaborationMemoryProvenanceError extends FederatedCollaborationMemoryError {
    constructor(message, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryProvenanceError';
    }
}
export class FederatedCollaborationMemoryContinuityError extends FederatedCollaborationMemoryError {
    driftType;
    constructor(message, driftType, tenantId, contextId) {
        super(message, tenantId, contextId);
        this.name = 'FederatedCollaborationMemoryContinuityError';
        this.driftType = driftType;
    }
}
// ----------------------------------------------------------------------------
// DETERMINISTIC CANONICAL JSON STRINGIFY & SHA-256 HASHERS
// ----------------------------------------------------------------------------
export function deterministicJsonStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map((item) => deterministicJsonStringify(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((k) => JSON.stringify(k) + ':' + deterministicJsonStringify(obj[k]));
    return '{' + pairs.join(',') + '}';
}
export function computeSha256(input) {
    return createHash('sha256').update(input, 'utf8').digest('hex');
}
export function computeCollaborationContextHash(context) {
    return computeSha256(`collab_context:${deterministicJsonStringify(context)}`);
}
export function computeMemoryEntryHash(entry) {
    return computeSha256(`memory_entry:${deterministicJsonStringify(entry)}`);
}
export function computeObservationHash(observation) {
    return computeSha256(`observation:${deterministicJsonStringify(observation)}`);
}
export function computeObservationReconciliationHash(rec) {
    return computeSha256(`observation_reconciliation:${deterministicJsonStringify(rec)}`);
}
export function computeConsensusProposalHash(proposal) {
    return computeSha256(`consensus_proposal:${deterministicJsonStringify(proposal)}`);
}
export function computeConsensusResultHash(result) {
    return computeSha256(`consensus_result:${deterministicJsonStringify(result)}`);
}
export function computeCollaborationSnapshotHash(snapshot) {
    return computeSha256(`collab_snapshot:${deterministicJsonStringify(snapshot)}`);
}
export function computeCollaborationAuditHash(record) {
    return computeSha256(`collab_audit:${deterministicJsonStringify(record)}`);
}
