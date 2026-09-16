// src/core/governedPolicyRemediation/GovernedPolicyRemediationTypes.ts
// Component 1198: GovernedPolicyRemediationTypes (REAL)
//
// Canonical contracts, branded IDs, 10-category failure root-cause taxonomy, circuit breaker states,
// 32 audit event types, typed error hierarchy, and pure deterministic SHA-256 hashers for MS-1.5.23.
// Định nghĩa các giao ước chuẩn, định danh branded, phân loại nguyên nhân gốc 10 nhóm, trạng thái circuit breaker,
// 32 loại sự kiện kiểm toán, hệ thống phân cấp lỗi và các hàm băm SHA-256 tiền định cho MS-1.5.23.
import { createHash } from 'node:crypto';
// Helper to brand strings safely
export function asRemediationId(id) {
    return id;
}
export function asRootCauseDiagnosisId(id) {
    return id;
}
export function asCircuitBreakerStateId(id) {
    return id;
}
export function asRemediationDossierId(id) {
    return id;
}
export function asRemediationAuditRecordId(id) {
    return id;
}
export function asHandoffId(id) {
    return id;
}
export const ALL_ROOT_CAUSE_CATEGORIES = Object.freeze([
    'RULE_OVER_RESTRICTION',
    'PARAMETER_LIMIT_MISMATCH',
    'BEHAVIORAL_DRIFT_CASCADE',
    'CROSS_DOMAIN_INVARIANT_CONFLICT',
    'LIFECYCLE_STATE_TIMING_RACE',
    'ENVIRONMENTAL_PRECONDITION_COLLAPSE',
    'AUTHORIZATION_TOKEN_EXHAUSTION',
    'TEMPORAL_CLOCK_DESYNCHRONIZATION',
    'TENANT_DOMAIN_MISALLOCATION',
    'UNKNOWN_ANOMALOUS_MUTATION',
]);
export const DEFAULT_CIRCUIT_BREAKER_PARAMS = Object.freeze({
    failureWindowSeconds: 300,
    failureThreshold: 3,
    initialCooldownSeconds: 300,
    backoffMultiplier: 2.0,
    maxCooldownSeconds: 3600,
    maxHalfOpenProbes: 1,
    resetSuccessThreshold: 2,
    lockoutThreshold: 5,
});
// ============================================================================
// 10. CONSTITUTIONAL INVARIANTS (IMMUTABLE BASELINE)
// ============================================================================
export const GOVERNED_POLICY_REMEDIATION_INVARIANTS = Object.freeze([
    'SOLE_HUMAN_AUTHORITY = TRUE',
    'HUMAN_AUTHORITY_COUNT = 1',
    'SECOND_HUMAN_AUTHORITY = FORBIDDEN',
    'ACTIVE_TWO_PERSON_AUTHORITY = NONE',
    'AGENT_CAPABILITY != HUMAN_AUTHORITY',
    'HUMAN_APPROVAL != AUTO_APPROVE',
    'REMEDIATION != MUTATION',
    'REMEDIATION != AUTHORIZATION',
    'REMEDIATION != RATIFICATION',
    'REMEDIATION_PROPOSAL != POLICY',
    'REMEDIATION_HASH != AUTHORIZATION',
    'AUTOMATION != REACTIVATION',
    'DIAGNOSIS != POLICY_CREATION',
    'DIAGNOSIS != EXECUTION',
    'DIAGNOSIS_CONFIDENCE != AUTHORIZATION',
    'DIAGNOSIS_CONFIDENCE != TRUTH',
    'CIRCUIT_BREAKER != PRIVILEGE_EXPANSION',
    'CIRCUIT_BREAKER != AUTHORIZATION',
    'CIRCUIT_BREAKER != POLICY_MUTATION',
    'CIRCUIT_BREAKER != EXECUTION',
    'OBSERVATION != DECISION',
    'DECISION != AUTHORIZATION',
    'AUTHORIZATION != MUTATION',
    'HASH != AUTHORIZATION',
    'EVIDENCE != AUTHORIZATION',
    'ASSURANCE_SCORE != AUTHORIZATION',
    'COMPLIANCE_RESULT != AUTHORIZATION',
    'RISK_SCORE != AUTHORIZATION',
    'CROSS_TENANT_RISK_VISIBILITY != CROSS_TENANT_DATA_ACCESS',
    'CROSS_TENANT_RISK_VISIBILITY != CROSS_TENANT_MUTATION',
    'HANDOFF != DELIBERATION',
    'DELIBERATION != APPROVAL',
    'APPROVAL != RATIFICATION',
    'RATIFICATION != EXECUTION',
    'ROLLBACK != POLICY_CREATION',
    'ROLLBACK != AUTHORITY_ESCALATION',
    'EMERGENCY_STOP > GOVERNANCE',
    'EMERGENCY_STOP > REMEDIATION',
    'EMERGENCY_STOP > CIRCUIT_BREAKER',
    'EMERGENCY_STOP > RUNTIME_COMPLIANCE',
    'STORE_REFERENCE != MUTATION_AUTHORITY',
    'RETIRED_IS_TERMINAL',
    'TENANT_BOUNDARY_STRICT',
]);
export const GENESIS_REMEDIATION_HASH = '0'.repeat(64);
// ============================================================================
// 11. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicyRemediationBaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GovernedPolicyRemediationBaseError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class RemediationAuthorityViolationError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[RemediationAuthorityViolationError] ${message}`);
        this.name = 'RemediationAuthorityViolationError';
    }
}
export class CrossTenantAccessForbiddenError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[CrossTenantAccessForbiddenError] ${message}`);
        this.name = 'CrossTenantAccessForbiddenError';
    }
}
export class CircuitBreakerOpenError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[CircuitBreakerOpenError] ${message}`);
        this.name = 'CircuitBreakerOpenError';
    }
}
export class CircuitBreakerLockoutError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[CircuitBreakerLockoutError] ${message}`);
        this.name = 'CircuitBreakerLockoutError';
    }
}
export class DuplicateRemediationHandoffError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[DuplicateRemediationHandoffError] ${message}`);
        this.name = 'DuplicateRemediationHandoffError';
    }
}
export class ExpiredRemediationHandoffError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[ExpiredRemediationHandoffError] ${message}`);
        this.name = 'ExpiredRemediationHandoffError';
    }
}
export class DeterministicDiagnosisError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[DeterministicDiagnosisError] ${message}`);
        this.name = 'DeterministicDiagnosisError';
    }
}
export class RemediationEvidenceError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[RemediationEvidenceError] ${message}`);
        this.name = 'RemediationEvidenceError';
    }
}
export class RemediationAuditLedgerError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[RemediationAuditLedgerError] ${message}`);
        this.name = 'RemediationAuditLedgerError';
    }
}
export class EmergencyStopActiveError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[EmergencyStopActiveError] ${message}`);
        this.name = 'EmergencyStopActiveError';
    }
}
export class SecondaryAuthorityRejectedError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[SecondaryAuthorityRejectedError] ${message}`);
        this.name = 'SecondaryAuthorityRejectedError';
    }
}
export class UntrustedInputSanitizationError extends GovernedPolicyRemediationBaseError {
    constructor(message) {
        super(`[UntrustedInputSanitizationError] ${message}`);
        this.name = 'UntrustedInputSanitizationError';
    }
}
// ============================================================================
// 12. DETERMINISTIC SERIALIZATION & SHA-256 HASH HELPERS
// ============================================================================
export function canonicalJsonSerialize(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map((item) => canonicalJsonSerialize(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((key) => JSON.stringify(key) + ':' + canonicalJsonSerialize(obj[key]));
    return '{' + pairs.join(',') + '}';
}
export function computeSha256(data) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
}
export function computeCorrelationHash(data) {
    return computeSha256(canonicalJsonSerialize(data));
}
export function computeDiagnosisHash(data) {
    return computeSha256(canonicalJsonSerialize(data));
}
export function computeBlastRadiusHash(data) {
    return computeSha256(canonicalJsonSerialize(data));
}
export function computeCandidateRemediationHash(data) {
    return computeSha256(canonicalJsonSerialize(data));
}
export function computeEvidenceDossierFingerprint(data) {
    return computeSha256(canonicalJsonSerialize(data));
}
export function computeAuditEventHash(sequenceNumber, timestamp, tenantId, policyDomain, eventType, eventPayload, previousEventHash) {
    const payload = {
        sequenceNumber,
        timestamp,
        tenantId,
        policyDomain,
        eventType,
        eventPayload,
        previousEventHash,
    };
    return computeSha256(canonicalJsonSerialize(payload));
}
