// src/core/governedCrossFederationConvergence/GovernedCrossFederationTypes.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1138 — REAL
//
// EN: Canonical ontology, error taxonomy, lifecycle states, and deterministic SHA-256 provenance hashers
//     for governed cross-federation strategy, convergence, and policy meta-governance.
// VI: Bản thể học chuẩn, phân loại lỗi, trạng thái vòng đời, và các hàm băm nguồn gốc xác định SHA-256
//     cho chiến lược liên đoàn chéo có quản trị, hội tụ và siêu quản trị chính sách.
import { createHash } from 'crypto';
// ----------------------------------------------------------------------------
// HARD CEILINGS & BOUNDS
// ----------------------------------------------------------------------------
export const MAX_ACTIVE_FEDERATIONS_PER_CONVERGENCE = 5;
export const MAX_STRATEGY_PROPOSALS_PER_CONVERGENCE = 50;
export const MAX_CONVERGENCE_ROUNDS = 10;
export const MAX_PARTICIPATING_AGENTS_TOTAL = 40;
export const MAX_INTER_FEDERATION_DEPENDENCY_DEPTH = 10;
export const MAX_CROSS_FEDERATION_STATE_SIZE = 10000;
export const MAX_ACTIVE_CONVERGENCE_SESSIONS = 3;
export const MAX_CONVERGENCE_REASSESSMENTS = 5;
export const MAX_CONSECUTIVE_CONVERGENCE_FAILURES = 3;
export const MAX_CONVERGENCE_DURATION_MS = 86400000; // 24 hours
export const MAX_AUDIT_LOG_RECORDS_PER_SESSION = 2000;
// ----------------------------------------------------------------------------
// TYPED ERRORS
// ----------------------------------------------------------------------------
export class GovernedCrossFederationError extends Error {
    tenantId;
    sessionId;
    constructor(message, tenantId, sessionId) {
        super(message);
        this.name = 'GovernedCrossFederationError';
        this.tenantId = tenantId;
        this.sessionId = sessionId;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class GovernedCrossFederationValidationError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationValidationError';
    }
}
export class GovernedCrossFederationTenantIsolationError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationTenantIsolationError';
    }
}
export class GovernedCrossFederationSessionIsolationError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationSessionIsolationError';
    }
}
export class GovernedCrossFederationAuthorizationError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationAuthorizationError';
    }
}
export class GovernedCrossFederationLeaseError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationLeaseError';
    }
}
export class GovernedCrossFederationBudgetError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationBudgetError';
    }
}
export class GovernedCrossFederationLifecycleError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationLifecycleError';
    }
}
export class GovernedCrossFederationConflictError extends GovernedCrossFederationError {
    category;
    constructor(message, category, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationConflictError';
        this.category = category;
    }
}
export class GovernedCrossFederationPolicyError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationPolicyError';
    }
}
export class GovernedCrossFederationConcurrencyError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationConcurrencyError';
    }
}
export class GovernedCrossFederationUserStopError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationUserStopError';
    }
}
export class GovernedCrossFederationEmergencyStopError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationEmergencyStopError';
    }
}
export class GovernedCrossFederationPersistenceError extends GovernedCrossFederationError {
    constructor(message, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationPersistenceError';
    }
}
export class GovernedCrossFederationContinuityError extends GovernedCrossFederationError {
    driftCategory;
    constructor(message, driftCategory, tenantId, sessionId) {
        super(message, tenantId, sessionId);
        this.name = 'GovernedCrossFederationContinuityError';
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
export function computeCrossFederationStrategyHash(strategy) {
    const { provenanceHash: _h, ...clean } = strategy;
    return computeSha256(`cross_fed_strategy:${deterministicJsonStringify(clean)}`);
}
export function computeConvergenceProposalHash(proposal) {
    const { provenanceHash: _h, ...clean } = proposal;
    return computeSha256(`convergence_proposal:${deterministicJsonStringify(clean)}`);
}
export function computeConvergenceRoundHash(roundData) {
    return computeSha256(`convergence_round:${deterministicJsonStringify(roundData)}`);
}
export function computeCrossReconciliationHash(rec) {
    const { provenanceHash: _h, ...clean } = rec;
    return computeSha256(`cross_reconciliation:${deterministicJsonStringify(clean)}`);
}
export function computePolicyMetaEvaluationHash(evaluation) {
    const { provenanceHash: _h, ...clean } = evaluation;
    return computeSha256(`policy_meta:${deterministicJsonStringify(clean)}`);
}
export function computeConvergenceStateSnapshotHash(state) {
    const { provenanceHash: _h, ...clean } = state;
    return computeSha256(`convergence_state:${deterministicJsonStringify(clean)}`);
}
export function computeConvergenceResultHash(result) {
    return computeSha256(`convergence_result:${deterministicJsonStringify(result)}`);
}
export function computeConvergenceAuditHash(audit) {
    const { eventHash: _h, ...clean } = audit;
    return computeSha256(`convergence_audit:${deterministicJsonStringify(clean)}`);
}
