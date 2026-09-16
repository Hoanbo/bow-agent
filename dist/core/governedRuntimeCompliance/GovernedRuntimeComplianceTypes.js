// src/core/governedRuntimeCompliance/GovernedRuntimeComplianceTypes.ts
// Component 1188: GovernedRuntimeComplianceTypes (REAL)
//
// Canonical contracts, branded IDs, 8-category violation taxonomy, sliding window models,
// 32 audit event types, typed error hierarchy, and pure deterministic SHA-256 hashers for MS-1.5.22.
// Định nghĩa các giao ước chuẩn, định danh branded, phân loại vi phạm 8 nhóm, mô hình cửa sổ trượt,
// 32 loại sự kiện kiểm toán, hệ thống phân cấp lỗi và các hàm băm SHA-256 tiền định cho MS-1.5.22.
import { createHash } from 'node:crypto';
// ============================================================================
// 3. HARD CEILINGS, WEIGHTS & THRESHOLDS
// ============================================================================
export const ASSURANCE_THRESHOLD_COMPLIANT = 0.95;
export const ASSURANCE_THRESHOLD_DEGRADED = 0.85;
export const WEIGHT_COMPLIANCE_RATIO = 0.50;
export const WEIGHT_VIOLATION_PENALTY = 0.30;
export const WEIGHT_DRIFT_MAGNITUDE = 0.15;
export const WEIGHT_OBSERVATION_FRESHNESS = 0.05;
export const FRESHNESS_DECAY_HALF_LIFE_SEC = 1800; // 30 minutes
export const MAX_SLIDING_WINDOW_OBSERVATIONS = 100;
export const MAX_SLIDING_WINDOW_DURATION_SEC = 3600; // 1 hour
export const MAX_CLOCK_SKEW_TOLERANCE_MS = 60_000; // 60 seconds
export const MAX_AUDIT_BATCH_SIZE = 100;
export const GENESIS_PREV_HASH = '0'.repeat(64);
export const SEVERITY_WEIGHT_TABLE = Object.freeze({
    CRITICAL: 10.0,
    HIGH: 5.0,
    MEDIUM: 2.0,
    LOW: 0.5,
});
export const MAX_SEVERITY_WEIGHT = 10.0;
// ============================================================================
// 4. CONSTITUTIONAL INVARIANTS
// ============================================================================
export const GOVERNED_RUNTIME_COMPLIANCE_INVARIANTS = Object.freeze([
    'SOLE_HUMAN_AUTHORITY = TRUE',
    'HUMAN_AUTHORITY_COUNT = 1',
    'SECOND_HUMAN_AUTHORITY = FORBIDDEN',
    'ACTIVE_TWO_PERSON_AUTHORITY = NONE',
    'AGENT_CAPABILITY != HUMAN_AUTHORITY',
    'HUMAN_APPROVAL != AUTO_APPROVE',
    'OBSERVATION != EXECUTION',
    'OBSERVATION != AUTHORIZATION',
    'OBSERVATION != POLICY_MUTATION',
    'DECISION != AUTHORIZATION',
    'AUTHORIZATION != MUTATION',
    'HASH != AUTHORIZATION',
    'EVIDENCE != AUTHORIZATION',
    'EVIDENCE != MUTATION_AUTHORITY',
    'ASSURANCE_SCORE != AUTHORIZATION',
    'COMPLIANCE_RESULT != AUTHORIZATION',
    'AUTOMATION != REACTIVATION',
    'ROLLBACK != POLICY_CREATION',
    'ROLLBACK != ESCALATION',
    'EMERGENCY_STOP > GOVERNANCE',
    'EMERGENCY_STOP > RUNTIME_COMPLIANCE',
    'STORE_REFERENCE != MUTATION_AUTHORITY',
    'RETIRED_IS_TERMINAL',
    'TENANT_BOUNDARY_STRICT',
]);
// ============================================================================
// 7. DETERMINISTIC SHA-256 HASH FUNCTIONS
// ============================================================================
export function canonicalJsonStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map((item) => canonicalJsonStringify(item)).join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
    return `{${entries.join(',')}}`;
}
export function computeSha256(content) {
    return createHash('sha256').update(content, 'utf8').digest('hex');
}
export function computeObservationHash(profile) {
    return computeSha256(canonicalJsonStringify(profile));
}
export function computeEvaluationHash(record) {
    return computeSha256(canonicalJsonStringify(record));
}
export function computeAssuranceHash(score) {
    return computeSha256(canonicalJsonStringify(score));
}
export function computeDossierFingerprint(dossierWithoutFingerprint) {
    return computeSha256(canonicalJsonStringify(dossierWithoutFingerprint));
}
export function computeAuditEventHash(prevHash, eventWithoutHashes, payload) {
    const payloadHash = computeSha256(canonicalJsonStringify(payload));
    const rawToHash = `${prevHash}|${payloadHash}|${canonicalJsonStringify(eventWithoutHashes)}`;
    const eventHash = computeSha256(rawToHash);
    return { payloadHash, eventHash };
}
// ============================================================================
// 8. TYPED ERROR HIERARCHY
// ============================================================================
export class RuntimeComplianceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RuntimeComplianceError';
    }
}
export class ObservationSanitizationError extends RuntimeComplianceError {
    constructor(message) {
        super(`[ObservationSanitizationError] ${message}`);
        this.name = 'ObservationSanitizationError';
    }
}
export class PolicyVersionBindingMismatchError extends RuntimeComplianceError {
    constructor(message) {
        super(`[PolicyVersionBindingMismatchError] ${message}`);
        this.name = 'PolicyVersionBindingMismatchError';
    }
}
export class PolicySnapshotUnavailableError extends RuntimeComplianceError {
    constructor(message) {
        super(`[PolicySnapshotUnavailableError] ${message}`);
        this.name = 'PolicySnapshotUnavailableError';
    }
}
export class TemporalClockSkewError extends RuntimeComplianceError {
    constructor(message) {
        super(`[TemporalClockSkewError] ${message}`);
        this.name = 'TemporalClockSkewError';
    }
}
export class ObservationSequenceError extends RuntimeComplianceError {
    constructor(message) {
        super(`[ObservationSequenceError] ${message}`);
        this.name = 'ObservationSequenceError';
    }
}
export class ObservationReplayError extends RuntimeComplianceError {
    constructor(message) {
        super(`[ObservationReplayError] ${message}`);
        this.name = 'ObservationReplayError';
    }
}
export class DeterministicEvaluationError extends RuntimeComplianceError {
    constructor(message) {
        super(`[DeterministicEvaluationError] ${message}`);
        this.name = 'DeterministicEvaluationError';
    }
}
export class AssuranceScoringError extends RuntimeComplianceError {
    constructor(message) {
        super(`[AssuranceScoringError] ${message}`);
        this.name = 'AssuranceScoringError';
    }
}
export class PolicyViolationDetectedError extends RuntimeComplianceError {
    constructor(message) {
        super(`[PolicyViolationDetectedError] ${message}`);
        this.name = 'PolicyViolationDetectedError';
    }
}
export class AdaptiveSafetyControlError extends RuntimeComplianceError {
    constructor(message) {
        super(`[AdaptiveSafetyControlError] ${message}`);
        this.name = 'AdaptiveSafetyControlError';
    }
}
export class AutomatedReactivationForbiddenError extends RuntimeComplianceError {
    constructor(message) {
        super(`[AutomatedReactivationForbiddenError] ${message}`);
        this.name = 'AutomatedReactivationForbiddenError';
    }
}
export class TenantAccessForbiddenError extends RuntimeComplianceError {
    constructor(message) {
        super(`[TenantAccessForbiddenError] ${message}`);
        this.name = 'TenantAccessForbiddenError';
    }
}
export class RuntimeComplianceAuditLedgerError extends RuntimeComplianceError {
    constructor(message) {
        super(`[RuntimeComplianceAuditLedgerError] ${message}`);
        this.name = 'RuntimeComplianceAuditLedgerError';
    }
}
export class EmergencyStopActiveError extends RuntimeComplianceError {
    constructor(message) {
        super(`[EmergencyStopActiveError] ${message}`);
        this.name = 'EmergencyStopActiveError';
    }
}
export class SecondaryAuthorityRejectedError extends RuntimeComplianceError {
    constructor(message) {
        super(`[SecondaryAuthorityRejectedError] ${message}`);
        this.name = 'SecondaryAuthorityRejectedError';
    }
}
