// src/core/policyEvolution/policyEvolutionTypes.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Canonical type definitions and DTO contracts for governed operational policy evolution,
// counterfactual incident simulation, guardrail margin calibration, supervisory review bridges,
// transactional policy rollout, automatic failure rollback, and cryptographic evolution provenance.
// Định nghĩa kiểu chuẩn tắc và các hợp đồng DTO cho tiến hóa chính sách vận hành có quản trị,
// mô phỏng sự cố phản thực tế, hiệu chuẩn biên giới an toàn, cầu nối đánh giá giám sát,
// triển khai chính sách có giao dịch, tự động hoàn tác khi lỗi và nguồn gốc mật mã tiến hóa.
//
// Authority Invariants:
// - Level 0 Read-Only Analysis (Simulation, Calibration)
// - Level 1 Advisory Recommendation / Proposal Staging
// - Level 2 Controlled Execution (Rollout, Rollback — STRICTLY GATED BY MASTER HUMAN OPERATOR)
// - POLICY_PROPOSAL != POLICY_MUTATION
// - COUNTERFACTUAL_SIMULATION != ACTIVE_EXECUTION
// - CONFIDENCE != AUTHORITY
export function createPolicyProposalId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_PROPOSAL_ID: raw proposal id must be a non-empty string');
    }
    return raw;
}
export function createSimulationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_SIMULATION_ID: raw simulation id must be a non-empty string');
    }
    return raw;
}
export function createEvolutionVersionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_EVOLUTION_VERSION_ID: raw version id must be a non-empty string');
    }
    return raw;
}
export function createPolicySnapshotId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_SNAPSHOT_ID: raw snapshot id must be a non-empty string');
    }
    return raw;
}
export function createReviewId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_REVIEW_ID: raw review id must be a non-empty string');
    }
    return raw;
}
export function createRolloutId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ROLLOUT_ID: raw rollout id must be a non-empty string');
    }
    return raw;
}
export function createRollbackId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ROLLBACK_ID: raw rollback id must be a non-empty string');
    }
    return raw;
}
export function createPolicyEvolutionProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PROVENANCE_ID: raw provenance id must be a non-empty string');
    }
    return raw;
}
