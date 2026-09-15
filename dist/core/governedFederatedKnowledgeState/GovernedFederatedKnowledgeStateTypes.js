// src/core/governedFederatedKnowledgeState/GovernedFederatedKnowledgeStateTypes.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1128 — REAL
//
// EN: Canonical ontology, error taxonomy, lifecycle states, and deterministic SHA-256 provenance hashers
//     for governed federated knowledge state and collective intelligence.
// VI: Bản thể học chuẩn, phân loại lỗi, trạng thái vòng đời, và các hàm băm nguồn gốc xác định SHA-256
//     cho trạng thái tri thức liên đoàn có quản trị và trí tuệ tập thể.
import { createHash } from 'crypto';
// ----------------------------------------------------------------------------
// HARD CEILINGS & BOUNDS
// ----------------------------------------------------------------------------
export const MAX_KNOWLEDGE_ENTRIES_PER_FEDERATION = 1000;
export const MAX_KNOWLEDGE_ENTRIES_PER_AGENT = 200;
export const MAX_EVIDENCE_PER_KNOWLEDGE_ENTRY = 20;
export const MAX_LINEAGE_DEPTH = 20;
export const MAX_KNOWLEDGE_STATE_SIZE = 5000;
export const MAX_MERGE_OPERATIONS_PER_STATE = 50;
export const MAX_RECONCILIATIONS_PER_STATE = 25;
export const MAX_ACTIVE_KNOWLEDGE_STATES = 3;
export const MAX_KNOWLEDGE_REASSESSMENTS = 10;
export const MAX_CONSECUTIVE_KNOWLEDGE_FAILURES = 3;
export const MAX_KNOWLEDGE_STATE_DURATION_MS = 86400000; // 24 hours
// ----------------------------------------------------------------------------
// TYPED ERRORS
// ----------------------------------------------------------------------------
export class GovernedFederatedKnowledgeStateError extends Error {
    tenantId;
    stateId;
    constructor(message, tenantId, stateId) {
        super(message);
        this.name = 'GovernedFederatedKnowledgeStateError';
        this.tenantId = tenantId;
        this.stateId = stateId;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class GovernedFederatedKnowledgeStateValidationError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateValidationError';
    }
}
export class GovernedFederatedKnowledgeStateTenantIsolationError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateTenantIsolationError';
    }
}
export class GovernedFederatedKnowledgeStateSessionIsolationError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateSessionIsolationError';
    }
}
export class GovernedFederatedKnowledgeStateAuthorizationError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateAuthorizationError';
    }
}
export class GovernedFederatedKnowledgeStateLeaseError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateLeaseError';
    }
}
export class GovernedFederatedKnowledgeStateBudgetError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateBudgetError';
    }
}
export class GovernedFederatedKnowledgeStateConflictError extends GovernedFederatedKnowledgeStateError {
    category;
    constructor(message, category, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateConflictError';
        this.category = category;
    }
}
export class GovernedFederatedKnowledgeStateConcurrencyError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateConcurrencyError';
    }
}
export class GovernedFederatedKnowledgeStateUserStopError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateUserStopError';
    }
}
export class GovernedFederatedKnowledgeStateEmergencyStopError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateEmergencyStopError';
    }
}
export class GovernedFederatedKnowledgeStatePersistenceError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStatePersistenceError';
    }
}
export class GovernedFederatedKnowledgeStateLineageError extends GovernedFederatedKnowledgeStateError {
    constructor(message, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateLineageError';
    }
}
export class GovernedFederatedKnowledgeStateContinuityError extends GovernedFederatedKnowledgeStateError {
    driftCategory;
    constructor(message, driftCategory, tenantId, stateId) {
        super(message, tenantId, stateId);
        this.name = 'GovernedFederatedKnowledgeStateContinuityError';
        this.driftCategory = driftCategory;
    }
}
// ----------------------------------------------------------------------------
// DETERMINISTIC SERIALIZATION & SHA-256 HASHING
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
export function computeKnowledgeEntryHash(entry) {
    const { provenanceHash: _h, ...clean } = entry;
    return computeSha256(`knowledge_entry:${deterministicJsonStringify(clean)}`);
}
export function computeKnowledgeEvidenceHash(evidence) {
    const { provenanceHash: _h, ...clean } = evidence;
    return computeSha256(`knowledge_evidence:${deterministicJsonStringify(clean)}`);
}
export function computeKnowledgeLineageHash(lineage) {
    const { provenanceHash: _h, ...clean } = lineage;
    return computeSha256(`knowledge_lineage:${deterministicJsonStringify(clean)}`);
}
export function computeKnowledgeMergeHash(merge) {
    const { provenanceHash: _h, ...clean } = merge;
    return computeSha256(`knowledge_merge:${deterministicJsonStringify(clean)}`);
}
export function computeKnowledgeReconciliationHash(rec) {
    const { provenanceHash: _h, ...clean } = rec;
    return computeSha256(`knowledge_reconciliation:${deterministicJsonStringify(clean)}`);
}
export function computeKnowledgeStateSnapshotHash(state) {
    const { provenanceHash: _h, ...clean } = state;
    return computeSha256(`knowledge_state:${deterministicJsonStringify(clean)}`);
}
export function computeKnowledgeResultHash(result) {
    return computeSha256(`knowledge_result:${deterministicJsonStringify(result)}`);
}
export function computeKnowledgeAuditHash(audit) {
    const { eventHash: _h, ...clean } = audit;
    return computeSha256(`knowledge_audit:${deterministicJsonStringify(clean)}`);
}
