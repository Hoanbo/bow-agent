// src/core/adaptiveAutonomy/adaptiveAutonomyTypes.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1088 — REAL
//
// EN: Canonical contracts, lifecycle states, error hierarchy, and deterministic provenance helpers
//     for native governed adaptive autonomy, bounded recovery, and supervised continuous operation.
// VI: Hợp đồng chính tắc, trạng thái vòng đời, hệ thống phân cấp lỗi và các trình trợ giúp nguồn gốc
//     xác định cho tự chủ thích ứng có quản trị, phục hồi có giới hạn và vận hành liên tục có giám sát.
import { createHash } from 'node:crypto';
// ============================================================================
// CONSTANTS & BUDGET CEILINGS
// ============================================================================
export const ADAPTIVE_AUTONOMY_SCHEMA_VERSION = '1.5.12';
/** Default & hard autonomy ceilings / Các giới hạn trần tự chủ mặc định & cứng */
export const MAX_OPERATIONAL_CYCLES = 100;
export const MAX_RECOVERY_ATTEMPTS = 3;
export const MAX_ADAPTATION_ATTEMPTS = 5;
export const MAX_CONTINUITY_GENERATIONS = 10;
export const MAX_SESSION_DURATION_MS = 86_400_000; // 24 hours
export const MAX_CONSECUTIVE_FAILURES = 3;
export const MAX_CONSECUTIVE_DEGRADATIONS = 3;
// ============================================================================
// GOVERNANCE ERROR TAXONOMY
// ============================================================================
export class AdaptiveAutonomyError extends Error {
    code;
    tenantId;
    sessionId;
    timestamp;
    constructor(message, code = 'ADAPTIVE_AUTONOMY_ERROR', tenantId, sessionId) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.tenantId = tenantId;
        this.sessionId = sessionId;
        this.timestamp = Date.now();
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class AdaptiveAutonomyValidationError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_VALIDATION_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyAuthorizationError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_AUTHORIZATION_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyTenantIsolationError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_TENANT_ISOLATION_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomySessionIsolationError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_SESSION_ISOLATION_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyLeaseError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_LEASE_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyBudgetError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_BUDGET_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyRecoveryError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_RECOVERY_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyAdaptationError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_ADAPTATION_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyConcurrencyError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_CONCURRENCY_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyUserStopError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_USER_STOP_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyEmergencyStopError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_EMERGENCY_STOP_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyPersistenceError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_PERSISTENCE_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyProvenanceError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_PROVENANCE_ERROR', tenantId, sessionId);
    }
}
export class AdaptiveAutonomyGovernanceError extends AdaptiveAutonomyError {
    constructor(message, tenantId, sessionId) {
        super(message, 'ADAPTIVE_AUTONOMY_GOVERNANCE_ERROR', tenantId, sessionId);
    }
}
// ============================================================================
// DETERMINISTIC SHA-256 PROVENANCE HELPERS
// ============================================================================
export function deterministicJsonStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map((item) => deterministicJsonStringify(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${deterministicJsonStringify(obj[key])}`);
    return '{' + pairs.join(',') + '}';
}
export function computeSha256(data) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
}
export function computeAuthorizationEnvelopeProvenanceHash(envelope) {
    return computeSha256(deterministicJsonStringify(envelope));
}
export function computeHealthEvaluationHash(evalData) {
    return computeSha256(deterministicJsonStringify(evalData));
}
export function computeRecoveryAttemptHash(attempt) {
    return computeSha256(deterministicJsonStringify(attempt));
}
export function computeAdaptationDecisionHash(decision) {
    return computeSha256(deterministicJsonStringify(decision));
}
export function computeContinuitySnapshotHash(snapshot) {
    return computeSha256(deterministicJsonStringify(snapshot));
}
export function computeAdaptiveSessionProvenanceHash(session) {
    return computeSha256(deterministicJsonStringify(session));
}
