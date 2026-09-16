// src/core/governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.ts
// Component 1168: GovernedPolicyDecisionIngestionTypes (REAL)
//
// Canonical types, branded IDs, 18-state lifecycle, 16 checkpoints, 38 audit event types,
// typed error hierarchy, and 8 deterministic SHA-256 hashers for MS-1.5.20.
// Định nghĩa kiểu dữ liệu chuẩn, ID định danh, máy trạng thái vòng đời 18 bước, 16 điểm kiểm soát an ninh,
// 38 sự kiện kiểm toán và 8 hàm băm SHA-256 cho MS-1.5.20.
import { createHash } from 'crypto';
import { canonicalPolicyDeltaArray, computePolicyDeltaHash, } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export { canonicalPolicyDeltaArray, computePolicyDeltaHash };
// ============================================================================
// 2. HARD CEILINGS & BOUNDS (TRẦN GIỚI HẠN BẤT BIẾN)
// ============================================================================
export const MAX_HANDOFFS_IN_FLIGHT = 5;
export const MAX_DELTAS_PER_PROPOSAL = 50;
export const MAX_POLICY_SIZE_BYTES = 512 * 1024; // 512 KB
export const MAX_CANONICAL_RULES = 500;
export const MAX_SHADOW_EVAL_TRACES = 500;
export const MAX_CANARY_COHORTS = 10;
export const MAX_HANDOFF_TTL_MS = 86_400_000; // 24 hours
export const MAX_CRITICAL_TTL_MS = 3_600_000; // configurable bounded default
export const MAX_MUTEX_WAIT_MS = 5_000; // 5 seconds
export const MAX_ROLLBACK_LINEAGE_DEPTH = 20;
export const MAX_AUDIT_LEDGER_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
// ============================================================================
// 3. CANONICAL CONSTITUTIONAL INVARIANTS (NGUYÊN TẮC HIẾN PHÁP BẤT BIẾN)
// ============================================================================
export const GOVERNED_POLICY_DECISION_INGESTION_INVARIANTS = Object.freeze([
    'MS-1.5.20 RECEIVES GOVERNANCE. MS-1.5.20 DOES NOT INVENT GOVERNANCE.',
    'RECOMMENDATION != POLICY',
    'DELIBERATION != APPROVAL',
    'APPROVED_FOR_PDP_HANDOFF != POLICY_APPROVED',
    'APPROVED_FOR_PDP_HANDOFF != EXECUTION_AUTHORIZATION',
    'HUMAN_APPROVAL != AUTONOMOUS_APPROVAL',
    'PDP_INGESTION != POLICY_RATIFICATION',
    'POLICY_RATIFICATION != POLICY_ACTIVATION',
    'POLICY_ACTIVATION != AGENT_EXECUTION',
    'RATIFICATION != TOOL_EXECUTION',
    'SIMULATION != EXECUTION',
    'SHADOW_RESULT != AUTHORIZATION',
    'ROLLBACK != POLICY_CREATION',
    'ROLLBACK != AUTHORITY_ESCALATION',
    'ROLLBACK != PDP_BYPASS',
    'TENANT_SCOPE != GLOBAL_SCOPE',
    'HASH != AUTHORIZATION',
    'STATE != PRIVILEGE',
    'PERSISTENCE != EXECUTION',
    'AGENT_CAPABILITY != HUMAN_AUTHORITY',
]);
export const TERMINAL_INGESTION_STATES = new Set([
    'REJECTED_BY_GATEWAY',
    'RATIFICATION_DENIED',
    'DEPLOYMENT_ROLLED_BACK',
    'SUPERSEDED',
    'FAULT_CRASH_RECOVERED',
    'HALTED_BY_USER_STOP',
    'HALTED_BY_EMERGENCY_STOP',
]);
export const CANARY_RINGS = Object.freeze({
    0: { ring: 0, name: 'Shadow', trafficPercentage: 0, description: '0% live traffic; pure replay shadow evaluation' },
    1: { ring: 1, name: 'Internal', trafficPercentage: 5, description: '5% traffic; internal canary cohort' },
    2: { ring: 2, name: 'Extended', trafficPercentage: 25, description: '25% traffic; non-critical federated missions' },
    3: { ring: 3, name: 'Broad', trafficPercentage: 50, description: '50% traffic; broad multi-agent federations' },
    4: { ring: 4, name: 'Full Active', trafficPercentage: 100, description: '100% traffic; canonical active production policy' },
});
// ============================================================================
// 9. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicyDecisionIngestionBaseError extends Error {
    code;
    constructor(message, code) {
        super(`[MS-1.5.20][${code}] ${message}`);
        this.code = code;
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class PolicyHandoffSchemaValidationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'HANDOFF_SCHEMA_VALIDATION_ERROR');
    }
}
export class PolicyHandoffReplayError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'HANDOFF_REPLAY_ERROR');
    }
}
export class HumanDecisionVerificationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'HUMAN_DECISION_VERIFICATION_ERROR');
    }
}
export class CriticalAffirmationVerificationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'CRITICAL_AFFIRMATION_VERIFICATION_ERROR');
    }
}
export class AuthoritativePolicyRatificationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'AUTHORITATIVE_RATIFICATION_ERROR');
    }
}
export class PolicyCompilationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'POLICY_COMPILATION_ERROR');
    }
}
export class PolicyVersionOCCConflictError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'POLICY_VERSION_OCC_CONFLICT_ERROR');
    }
}
export class PolicyStagedDeploymentError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'POLICY_STAGED_DEPLOYMENT_ERROR');
    }
}
export class PolicyRollbackError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'POLICY_ROLLBACK_ERROR');
    }
}
export class PolicyTenantIsolationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'TENANT_ISOLATION_ERROR');
    }
}
export class PolicyCircuitBreakerTrippedError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'CIRCUIT_BREAKER_TRIPPED_ERROR');
    }
}
export class PolicyIngestionInterlockActiveError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message) {
        super(message, 'INTERLOCK_ACTIVE_ERROR');
    }
}
// ============================================================================
// 10. DETERMINISTIC SHA-256 HASH HELPERS
// ============================================================================
function canonicalizeJson(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalizeJson).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalizeJson(obj[k])).join(',') + '}';
}
export function computeCanonicalPolicyDeltaHash(deltas) {
    return computePolicyDeltaHash(deltas);
}
export function computeHandoffIntakeHash(payload) {
    return createHash('sha256').update(canonicalizeJson(payload)).digest('hex');
}
export function computeHumanDecisionTokenHash(operatorId, proposalId, dossierHash, nonce, policyDeltaHash) {
    const payload = policyDeltaHash
        ? `${operatorId}:${proposalId}:${dossierHash}:${policyDeltaHash}:${nonce}`
        : `${operatorId}:${proposalId}:${dossierHash}:${nonce}`;
    return createHash('sha256').update(payload).digest('hex');
}
export function computeRatificationRecordHash(record) {
    return createHash('sha256').update(canonicalizeJson(record)).digest('hex');
}
export function computeCanonicalPolicyHash(policy) {
    const normalized = {
        policyId: policy.policyId,
        tenantId: policy.tenantId,
        policyDomain: policy.policyDomain,
        policyVersion: policy.policyVersion,
        parentVersion: policy.parentVersion,
        rules: policy.rules,
    };
    return createHash('sha256').update(canonicalizeJson(normalized)).digest('hex');
}
export function computeShadowEvaluationReportHash(report) {
    return createHash('sha256').update(canonicalizeJson(report)).digest('hex');
}
export function computePolicyDeploymentRecordHash(record) {
    return createHash('sha256').update(canonicalizeJson(record)).digest('hex');
}
export function computeRollbackRecordHash(record) {
    return createHash('sha256').update(canonicalizeJson(record)).digest('hex');
}
export function computeIngestionAuditHash(event) {
    const content = `${event.eventId}:${event.eventType}:${event.tenantId}:${event.timestamp}:${event.prevHash}:${canonicalizeJson(event.details)}`;
    return createHash('sha256').update(content).digest('hex');
}
