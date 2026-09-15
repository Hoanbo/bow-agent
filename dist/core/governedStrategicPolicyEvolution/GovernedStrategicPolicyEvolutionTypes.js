// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1158: GovernedStrategicPolicyEvolutionTypes
// Canonical Contracts, Ontology, Error Hierarchy, Ceilings, & Provenance Hashers
// ============================================================================
import * as crypto from 'crypto';
// EN: Mandatory governance invariants asserting that deliberation does not equal policy authority or execution.
// VI: Các bất biến quản trị bắt buộc khẳng định rằng nghị sự không đồng nghĩa với quyền chính sách hay thực thi.
export const STRATEGIC_POLICY_EVOLUTION_INVARIANTS = {
    AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: 'AGENT_CAPABILITY != HUMAN_AUTHORITY',
    KNOWLEDGE_NOT_AUTHORIZATION: 'KNOWLEDGE != AUTHORIZATION',
    CONSENSUS_NOT_AUTHORIZATION: 'CONSENSUS != AUTHORIZATION',
    CONFIDENCE_NOT_AUTHORITY: 'CONFIDENCE != AUTHORITY',
    AGREEMENT_NOT_HUMAN_APPROVAL: 'AGREEMENT != HUMAN_APPROVAL',
    STATE_NOT_PRIVILEGE: 'STATE != PRIVILEGE',
    PERSISTENCE_NOT_EXECUTION: 'PERSISTENCE != EXECUTION',
    COLLECTIVE_INTELLIGENCE_NOT_HUMAN_GOVERNANCE: 'COLLECTIVE_INTELLIGENCE != HUMAN_GOVERNANCE',
    STRATEGIC_MEMORY_NOT_EXECUTION_PERMISSION: 'STRATEGIC_MEMORY != EXECUTION_PERMISSION',
    LEARNED_POLICY_NOT_AUTHORIZATION: 'LEARNED_POLICY != AUTHORIZATION',
    MS_1518_NOT_AUTONOMY_LEASE_AUTHORITY: 'MS-1.5.18 != AUTONOMY_LEASE_AUTHORITY',
    MS_1518_NOT_DIRECT_EXECUTION: 'MS-1.5.18 != DIRECT_EXECUTION',
    MS_1519_NOT_PDP: 'MS-1.5.19 != PDP',
    MS_1519_NOT_AUTONOMY_LEASE_AUTHORITY: 'MS-1.5.19 != AUTONOMY_LEASE_AUTHORITY',
    MS_1519_NOT_DIRECT_EXECUTION: 'MS-1.5.19 != DIRECT_EXECUTION',
    RECOMMENDATION_NOT_POLICY: 'RECOMMENDATION != POLICY',
    RECOMMENDATION_NOT_AUTHORIZATION: 'RECOMMENDATION != AUTHORIZATION',
    DELIBERATION_NOT_APPROVAL: 'DELIBERATION != APPROVAL',
    APPROVED_FOR_PDP_HANDOFF_NOT_POLICY_APPROVED: 'APPROVED_FOR_PDP_HANDOFF != POLICY_APPROVED',
    APPROVED_FOR_PDP_HANDOFF_NOT_POLICY_MUTATION_AUTHORIZATION: 'APPROVED_FOR_PDP_HANDOFF != POLICY_MUTATION_AUTHORIZATION',
    APPROVED_FOR_PDP_HANDOFF_NOT_EXECUTION_AUTHORIZATION: 'APPROVED_FOR_PDP_HANDOFF != EXECUTION_AUTHORIZATION',
    HUMAN_DELIBERATION_NOT_POLICY_MUTATION: 'HUMAN_DELIBERATION != POLICY_MUTATION',
    HUMAN_APPROVAL_NOT_DIRECT_EXECUTION: 'HUMAN_APPROVAL != DIRECT_EXECUTION',
    SIMULATION_NOT_EXECUTION: 'SIMULATION != EXECUTION',
    SIMULATION_RESULT_NOT_AUTHORIZATION: 'SIMULATION_RESULT != AUTHORIZATION',
    SIMULATION_RESULT_NOT_EXECUTION: 'SIMULATION_RESULT != EXECUTION',
    ADVISORY_RESULT_NOT_AUTHORIZATION: 'ADVISORY_RESULT != AUTHORIZATION',
    HASH_NOT_AUTHORIZATION: 'HASH != AUTHORIZATION',
    LEASE_SUPERVISION_NOT_LEASE_EXPANSION: 'LEASE_SUPERVISION != LEASE_EXPANSION',
};
export const GOVERNED_STRATEGIC_POLICY_EVOLUTION_INVARIANTS = STRATEGIC_POLICY_EVOLUTION_INVARIANTS;
// EN: Strict hard ceilings to guarantee bounded CPU, memory, and storage footprints.
// VI: Các giới hạn trần cứng nghiêm ngặt để đảm bảo giới hạn sử dụng tài nguyên CPU, bộ nhớ và lưu trữ.
export const MAX_POLICY_PROPOSALS_PER_TENANT = 500;
export const MAX_ACTIVE_DELIBERATION_SESSIONS = 3;
export const MAX_EVIDENCE_RECORDS_PER_PROPOSAL = 50;
export const MAX_HISTORICAL_PRECEDENTS_PER_PROPOSAL = 20;
export const MAX_SIMULATION_SCENARIOS_PER_ROUND = 10;
export const MAX_SIMULATION_DEPTH = 5;
export const MAX_IMPACT_ANALYSIS_DIMENSIONS = 10;
export const MAX_DELIBERATION_DOSSIER_SIZE_BYTES = 5242880; // 5 MB
export const MAX_DELIBERATION_SESSION_DURATION_MS = 86400000; // 24 hours
export const MAX_CONCURRENT_SIMULATIONS = 3;
export const MAX_AUDIT_LOG_RECORDS_PER_SESSION = 2000;
export const TERMINAL_POLICY_EVOLUTION_STATES = [
    'APPROVED_FOR_PDP_HANDOFF',
    'REJECTED_BY_HUMAN',
    'EXPIRED',
    'SUPERSEDED',
    'FAILED',
    'HALTED_BY_USER_STOP',
    'HALTED_BY_EMERGENCY_STOP',
];
// EN: Typed error hierarchy for strategic policy evolution.
// VI: Cây phân cấp lỗi có kiểu cho tiến hóa chính sách chiến lược.
export class StrategicPolicyEvolutionBaseError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
export class PolicyMutationViolationError extends StrategicPolicyEvolutionBaseError {
}
export class InvalidProposalLifecycleTransitionError extends StrategicPolicyEvolutionBaseError {
}
export class StrategicPolicyEvolutionOCCConflictError extends StrategicPolicyEvolutionBaseError {
}
export class StrategicPolicySecurityCheckpointError extends StrategicPolicyEvolutionBaseError {
}
export class ConstitutionalInvariantViolationError extends StrategicPolicyEvolutionBaseError {
}
export class UnauthorizedHumanDecisionError extends StrategicPolicyEvolutionBaseError {
}
export class SimulationCeilingExceededError extends StrategicPolicyEvolutionBaseError {
}
export class TenantIsolationViolationError extends StrategicPolicyEvolutionBaseError {
}
export class StrategicPolicyPersistenceError extends StrategicPolicyEvolutionBaseError {
}
// EN: Canonical serialization helper for deterministic SHA-256 hashing.
// VI: Hàm tuần tự hóa chuẩn tắc để tạo băm SHA-256 xác định.
function canonicalJsonSerialize(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalJsonSerialize).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys
        .filter((k) => k !== 'provenanceHash' && k !== 'updatedAt' && k !== 'eventHash' && k !== 'pdpHandoffPackage')
        .map((k) => `${JSON.stringify(k)}:${canonicalJsonSerialize(obj[k])}`);
    return '{' + pairs.join(',') + '}';
}
function sha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
// EN: 8 deterministic SHA-256 provenance hashers.
// VI: 8 hàm băm nguồn gốc xác định SHA-256.
export function computePolicyEvolutionProposalHash(proposal) {
    return sha256(canonicalJsonSerialize(proposal));
}
export function computeAdvisoryMediationRecordHash(record) {
    return sha256(canonicalJsonSerialize(record));
}
export function computePolicyImpactAnalysisHash(analysis) {
    return sha256(canonicalJsonSerialize(analysis));
}
export function computeCounterfactualSimulationHash(simulation) {
    return sha256(canonicalJsonSerialize(simulation));
}
export function computeConstitutionalInvariantEvaluationHash(evalResult) {
    return sha256(canonicalJsonSerialize(evalResult));
}
export function computeDeliberationDossierHash(dossier) {
    return sha256(canonicalJsonSerialize(dossier));
}
export function computeHumanDecisionRecordHash(decision) {
    return sha256(canonicalJsonSerialize(decision));
}
export function computeStrategicPolicyAuditHash(event) {
    return sha256(canonicalJsonSerialize(event));
}
