// src/core/governedPolicyLifecycle/GovernedPolicyLifecycleTypes.ts
// Component 1178: GovernedPolicyLifecycleTypes (REAL)
//
// Canonical contracts, branded IDs, 8-state lifecycle, 16 checkpoints, 32 audit events,
// typed error hierarchy, and pure deterministic SHA-256 hashers for MS-1.5.21.
import { createHash } from 'crypto';
export const ALL_LIFECYCLE_STATES = Object.freeze([
    'PROPOSED',
    'RATIFIED',
    'STAGED',
    'ACTIVE',
    'DEGRADED',
    'SUSPENDED',
    'ROLLED_BACK',
    'RETIRED',
]);
export const TERMINAL_LIFECYCLE_STATES = new Set([
    'RETIRED',
]);
export const ACTIVE_OPERATIONAL_STATES = new Set([
    'ACTIVE',
    'DEGRADED',
]);
export const PAUSED_OPERATIONAL_STATES = new Set([
    'SUSPENDED',
]);
// ============================================================================
// 3. HARD CEILINGS & THRESHOLDS
// ============================================================================
export const HEALTH_THRESHOLD_DEGRADED = 0.95;
export const HEALTH_THRESHOLD_CRITICAL = 0.85;
export const HEALTH_THRESHOLD_RESTORED = 0.98;
export const MAX_DECISION_LATENCY_OVERHEAD_MS = 50;
export const MAX_LINEAGE_DEPTH = 100;
export const MAX_ACTIVE_INCIDENTS_PER_DOMAIN = 50;
export const MAX_TOKEN_TTL_MS = 3_600_000; // 1 hour
export const MAX_LIFECYCLE_MUTEX_WAIT_MS = 5_000; // 5 seconds
export const GENESIS_PREV_HASH = '0'.repeat(64);
// ============================================================================
// 4. CANONICAL CONSTITUTIONAL INVARIANTS
// ============================================================================
export const GOVERNED_POLICY_LIFECYCLE_INVARIANTS = Object.freeze([
    'SOLE_HUMAN_AUTHORITY = TRUE',
    'HUMAN_AUTHORITY_COUNT = 1',
    'SECOND_HUMAN_AUTHORITY = FORBIDDEN',
    'ACTIVE_TWO_PERSON_AUTHORITY = NONE',
    'AGENT_CAPABILITY != HUMAN_AUTHORITY',
    'HUMAN_APPROVAL != AUTO_APPROVE',
    'HASH != AUTHORIZATION',
    'PDP_INGESTION != RATIFICATION',
    'ROLLBACK != POLICY_CREATION',
    'ROLLBACK != ESCALATION',
    'EMERGENCY_STOP > GOVERNANCE',
    'EMERGENCY_STOP > DEPLOYMENT',
    'EMERGENCY_STOP > ROLLBACK',
    'EMERGENCY_STOP > LIFECYCLE',
    'STORE_REFERENCE != MUTATION',
    'BACKUP_INTEGRITY != AUTHORIZATION',
    'OBSERVATION != DECISION',
    'DECISION != AUTHORIZATION',
    'AUTHORIZATION != MUTATION',
    'RECOMMENDATION != AUTHORIZATION',
    'EVIDENCE != MUTATION_AUTHORITY',
    'AUTOMATION != REACTIVATION',
    'RETIRED_IS_TERMINAL',
    'TENANT_BOUNDARY_STRICT',
]);
// ============================================================================
// 8. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicyLifecycleBaseError extends Error {
    code;
    constructor(message, code) {
        super(`[MS-1.5.21][${code}] ${message}`);
        this.code = code;
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class InvalidLifecycleTransitionError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'INVALID_LIFECYCLE_TRANSITION');
    }
}
export class UnauthorizedLifecycleMutationError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'UNAUTHORIZED_LIFECYCLE_MUTATION');
    }
}
export class AntiAgentIdentityRejectedError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'ANTI_AGENT_IDENTITY_REJECTED');
    }
}
export class SecondaryAuthorityRejectedError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'SECONDARY_AUTHORITY_REJECTED');
    }
}
export class PolicyLifecycleOCCConflictError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_LIFECYCLE_OCC_CONFLICT');
    }
}
export class PolicyLifecycleTenantIsolationError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_LIFECYCLE_TENANT_ISOLATION_ERROR');
    }
}
export class PolicyLifecycleTerminalStateError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_LIFECYCLE_TERMINAL_STATE_ERROR');
    }
}
export class PolicyLifecycleInterlockActiveError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_LIFECYCLE_INTERLOCK_ACTIVE');
    }
}
export class PolicyHealthThresholdError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_HEALTH_THRESHOLD_ERROR');
    }
}
export class PolicyIncidentManagementError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_INCIDENT_MANAGEMENT_ERROR');
    }
}
export class PolicyLineageIntegrityError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_LINEAGE_INTEGRITY_ERROR');
    }
}
export class PolicyOperationalEvidenceError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_OPERATIONAL_EVIDENCE_ERROR');
    }
}
export class PolicyLifecycleAuditIntegrityError extends GovernedPolicyLifecycleBaseError {
    constructor(message) {
        super(message, 'POLICY_LIFECYCLE_AUDIT_INTEGRITY_ERROR');
    }
}
// ============================================================================
// 9. PURE DETERMINISTIC SERIALIZATION & HASHERS
// ============================================================================
export function canonicalJsonStringify(obj) {
    if (obj === null || obj === undefined)
        return JSON.stringify(obj);
    if (typeof obj !== 'object')
        return JSON.stringify(obj);
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const entries = keys.map((k) => `"${k}":${canonicalJsonStringify(obj[k])}`);
    return '{' + entries.join(',') + '}';
}
export function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
            deepFreeze(val);
        }
    }
    return obj;
}
export function computeLifecycleRecordHash(record) {
    const canonical = canonicalJsonStringify(record);
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeHealthReportHash(report) {
    const canonical = canonicalJsonStringify(report);
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeIncidentRecordHash(incident) {
    const canonical = canonicalJsonStringify(incident);
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeLineageNodeHash(node) {
    const canonical = canonicalJsonStringify(node);
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeEvidenceDossierHash(dossier) {
    const canonical = canonicalJsonStringify(dossier);
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeLifecycleAuditHash(prevHash, event) {
    const { eventHash, prevHash: _p, ...rest } = event;
    const canonical = canonicalJsonStringify(rest);
    return createHash('sha256').update(prevHash + canonical, 'utf8').digest('hex');
}
