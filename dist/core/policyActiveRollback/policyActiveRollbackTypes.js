// src/core/policyActiveRollback/policyActiveRollbackTypes.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Canonical Contracts & DTOs (Component 807).
// Defines immutable branded types, explicit state machines, and frozen governance DTOs
// for governed active policy rollback, sunset, and recovery operations.
//
// Core Authority Invariants:
// - ACTIVE_POLICY != ROLLBACK_TARGET
// - ACTIVE_POLICY != SUNSET_REQUEST
// - ROLLBACK_REQUEST != ROLLBACK_COMMIT
// - SUNSET_REQUEST != POLICY_MUTATION
// - RECOVERY_REQUEST != AUTONOMOUS_RECOVERY
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - FAIL_CLOSED
export function createActiveRollbackRequestId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ACTIVE_ROLLBACK_REQUEST_ID: raw rollback request id must be a non-empty string');
    }
    return raw;
}
export function createRollbackTargetId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ROLLBACK_TARGET_ID: raw rollback target id must be a non-empty string');
    }
    return raw;
}
export function createRollbackEvaluationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ROLLBACK_EVALUATION_ID: raw rollback evaluation id must be a non-empty string');
    }
    return raw;
}
export function createSunsetRequestId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_SUNSET_REQUEST_ID: raw sunset request id must be a non-empty string');
    }
    return raw;
}
export function createSunsetEvaluationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_SUNSET_EVALUATION_ID: raw sunset evaluation id must be a non-empty string');
    }
    return raw;
}
export function createRecoveryRequestId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RECOVERY_REQUEST_ID: raw recovery request id must be a non-empty string');
    }
    return raw;
}
export function createRecoveryEvaluationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RECOVERY_EVALUATION_ID: raw recovery evaluation id must be a non-empty string');
    }
    return raw;
}
export function createRollbackCommitId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ROLLBACK_COMMIT_ID: raw rollback commit id must be a non-empty string');
    }
    return raw;
}
export function createSunsetCommitId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_SUNSET_COMMIT_ID: raw sunset commit id must be a non-empty string');
    }
    return raw;
}
export function createRecoveryCommitId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RECOVERY_COMMIT_ID: raw recovery commit id must be a non-empty string');
    }
    return raw;
}
export function createRollbackProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ROLLBACK_PROVENANCE_ID: raw rollback provenance id must be a non-empty string');
    }
    return raw;
}
// ============================================================================
// CANONICAL HARD-FORBIDDEN ACTIONS FLOOR
// ============================================================================
export const ROLLBACK_HARD_FORBIDDEN_ACTIONS = [
    'transfer_funds',
    'delete_database',
    'bypass_robot_interlocks',
    'execute_untrusted_host_script',
];
