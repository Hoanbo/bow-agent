// src/core/governedPolicySimulation/GovernedPolicySimulationTypes.ts
// Component 1208: GovernedPolicySimulationTypes (REAL)
//
// Canonical contracts, branded IDs, simulation taxonomy, 32 audit event types,
// typed error hierarchy, and deterministic SHA-256 hashers for MS-1.5.24.
// Định nghĩa các giao ước chuẩn, định danh branded, phân loại mô phỏng, 32 loại sự kiện kiểm toán,
// hệ thống phân cấp lỗi và các hàm băm SHA-256 tiền định cho MS-1.5.24.
import { createHash } from 'node:crypto';
export function asSimulationSessionId(id) {
    return id;
}
export function asCounterfactualEvaluationId(id) {
    return id;
}
export function asShadowRunId(id) {
    return id;
}
export function asSimulationDossierId(id) {
    return id;
}
export function asSimulationAuditRecordId(id) {
    return id;
}
export function asSimulationHandoffId(id) {
    return id;
}
// ============================================================================
// 5. CONSTANTS & INVARIANTS
// ============================================================================
export const GENESIS_SIMULATION_HASH = '0'.repeat(64);
export const MAX_HANDOFF_TTL_MS = 86_400_000; // 24 hours
export const DEFAULT_SIMULATION_DOSSIER_TTL_MS = 7 * 86_400_000; // 7 days
export const DEFAULT_FALSE_REJECTION_THRESHOLD = 0.05; // 5%
export const MAX_LOCK_TIMEOUT_MS = 5000;
export const GOVERNED_POLICY_SIMULATION_INVARIANTS = Object.freeze({
    SOLE_HUMAN_AUTHORITY: true,
    HUMAN_AUTHORITY_COUNT: 1,
    SECOND_HUMAN_AUTHORITY: false,
    ACTIVE_TWO_PERSON_AUTHORITY: 'NONE',
    AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: true,
    HUMAN_APPROVAL_NOT_AUTO_APPROVE: true,
    SIMULATION_NOT_RATIFICATION: true,
    SIMULATION_NOT_ACTIVATION: true,
    SIMULATION_NOT_MUTATION: true,
    SIMULATION_NOT_AUTHORIZATION: true,
    SIMULATION_RESULT_NOT_APPROVAL: true,
    SIMULATION_SCORE_NOT_AUTHORITY: true,
    SHADOW_VERDICT_NOT_PDP_DECISION: true,
    SHADOW_NOT_LIVE_EXECUTION: true,
    SHADOW_NOT_CANARY: true,
    REPLAY_NOT_ACTUATION: true,
    COUNTERFACTUAL_NOT_FACTUAL: true,
    HASH_NOT_AUTHORIZATION: true,
    EMERGENCY_STOP_DOMINATES: true,
    TENANT_BOUNDARY_STRICT: true,
});
// ============================================================================
// 6. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicySimulationBaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GovernedPolicySimulationBaseError';
    }
}
export class SimulationAuthorityViolationError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationAuthorityViolationError';
    }
}
export class SimulationCrossTenantAccessForbiddenError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationCrossTenantAccessForbiddenError';
    }
}
export class SimulationDeadlockDetectedError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationDeadlockDetectedError';
    }
}
export class SimulationReplayCorpusCorruptedError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationReplayCorpusCorruptedError';
    }
}
export class SimulationEmergencyStopActiveError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationEmergencyStopActiveError';
    }
}
export class SimulationSecondaryAuthorityRejectedError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationSecondaryAuthorityRejectedError';
    }
}
export class SimulationAuditLedgerIntegrityError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationAuditLedgerIntegrityError';
    }
}
export class SimulationHandoffExpiredError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationHandoffExpiredError';
    }
}
export class DuplicateSimulationHandoffError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'DuplicateSimulationHandoffError';
    }
}
export class SimulationUntrustedInputSanitizationError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationUntrustedInputSanitizationError';
    }
}
export class SimulationLockTimeoutError extends GovernedPolicySimulationBaseError {
    constructor(message) {
        super(message);
        this.name = 'SimulationLockTimeoutError';
    }
}
// Aliases for convenience within subsystem
export { SimulationEmergencyStopActiveError as EmergencyStopActiveError, SimulationCrossTenantAccessForbiddenError as CrossTenantAccessForbiddenError, };
// ============================================================================
// 7. DETERMINISTIC JSON SERIALIZATION & SHA-256 HASH HELPERS
// ============================================================================
export function canonicalJsonSerialize(value) {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
        return JSON.stringify(value);
    }
    if (typeof value === 'string') {
        return JSON.stringify(value.normalize('NFC'));
    }
    if (Array.isArray(value)) {
        return '[' + value.map((item) => canonicalJsonSerialize(item)).join(',') + ']';
    }
    if (typeof value === 'object') {
        const sortedKeys = Object.keys(value).sort();
        const entries = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJsonSerialize(value[k])}`);
        return '{' + entries.join(',') + '}';
    }
    return JSON.stringify(String(value));
}
export function computeSha256(data) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
}
export function computeReplayCorpusHash(corpus) {
    return computeSha256(canonicalJsonSerialize(corpus));
}
export function computeCandidatePolicyHash(deltas, basePolicyHash) {
    return computeSha256(canonicalJsonSerialize({ deltas, basePolicyHash }));
}
export function computeProjectionHash(projection) {
    return computeSha256(canonicalJsonSerialize(projection));
}
export function computeInvariantCheckHash(result) {
    return computeSha256(canonicalJsonSerialize(result));
}
export function computeStressHash(result) {
    return computeSha256(canonicalJsonSerialize(result));
}
export function computeSimulationDossierFingerprint(dossierPayload) {
    return computeSha256(canonicalJsonSerialize(dossierPayload));
}
export function computeAuditEventHash(previousEventHash, eventData) {
    return computeSha256(previousEventHash + canonicalJsonSerialize(eventData));
}
// ============================================================================
// 8. PROMPT INJECTION & UNTRUSTED TEXT SANITIZATION
// ============================================================================
export function sanitizeUntrustedText(text, maxLength = 2048) {
    if (typeof text !== 'string') {
        return '';
    }
    // Strip control characters (except common whitespace)
    let sanitized = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    // Truncate to maximum length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.slice(0, maxLength);
    }
    // Detect and neutralize prompt injection attack patterns
    const injectionPatterns = [
        /SYSTEM:\s*/gi,
        /ASSISTANT:\s*/gi,
        /HUMAN:\s*/gi,
        /IGNORE\s+ALL\s+PREVIOUS\s+INSTRUCTIONS/gi,
        /IGNORE\s+PREVIOUS\s+COMMANDS/gi,
        /DISREGARD\s+GOVERNANCE/gi,
        /APPROVE\s+THIS\s+POLICY/gi,
        /AUTHORIZE\s+IMMEDIATELY/gi,
    ];
    for (const pattern of injectionPatterns) {
        sanitized = sanitized.replace(pattern, '[SANITIZED_INSTRUCTION]');
    }
    return sanitized.trim();
}
