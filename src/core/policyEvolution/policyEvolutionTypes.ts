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

import type { ActionClassification } from '../policyDecisionPoint.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// CÁC ĐỊNH DANH ĐƯỢC GẮN NHÃN (BRANDED)
// ============================================================================

export type PolicyProposalId = string & { readonly __brand: unique symbol };
export type SimulationId = string & { readonly __brand: unique symbol };
export type EvolutionVersionId = string & { readonly __brand: unique symbol };
export type PolicySnapshotId = string & { readonly __brand: unique symbol };
export type ReviewId = string & { readonly __brand: unique symbol };
export type RolloutId = string & { readonly __brand: unique symbol };
export type RollbackId = string & { readonly __brand: unique symbol };
export type PolicyEvolutionProvenanceId = string & { readonly __brand: unique symbol };

export function createPolicyProposalId(raw: string): PolicyProposalId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_PROPOSAL_ID: raw proposal id must be a non-empty string');
  }
  return raw as PolicyProposalId;
}

export function createSimulationId(raw: string): SimulationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_SIMULATION_ID: raw simulation id must be a non-empty string');
  }
  return raw as SimulationId;
}

export function createEvolutionVersionId(raw: string): EvolutionVersionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_EVOLUTION_VERSION_ID: raw version id must be a non-empty string');
  }
  return raw as EvolutionVersionId;
}

export function createPolicySnapshotId(raw: string): PolicySnapshotId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_SNAPSHOT_ID: raw snapshot id must be a non-empty string');
  }
  return raw as PolicySnapshotId;
}

export function createReviewId(raw: string): ReviewId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_REVIEW_ID: raw review id must be a non-empty string');
  }
  return raw as ReviewId;
}

export function createRolloutId(raw: string): RolloutId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ROLLOUT_ID: raw rollout id must be a non-empty string');
  }
  return raw as RolloutId;
}

export function createRollbackId(raw: string): RollbackId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ROLLBACK_ID: raw rollback id must be a non-empty string');
  }
  return raw as RollbackId;
}

export function createPolicyEvolutionProvenanceId(raw: string): PolicyEvolutionProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PROVENANCE_ID: raw provenance id must be a non-empty string');
  }
  return raw as PolicyEvolutionProvenanceId;
}

// ============================================================================
// POLICY CONFIGURATION & SNAPSHOT CONTRACTS
// HỢP ĐỒNG CẤU HÌNH & BẢN CHỤP CHÍNH SÁCH
// ============================================================================

export interface PolicyGuardrailConfig {
  readonly minApprovalTimeoutMs: number;
  readonly maxRetries: number;
  readonly errorBudgetThreshold: number; // e.g. 0.05
  readonly canaryObservationWindowMinutes: number;
  readonly allowAutonomousDegradation: false; // Hard invariant
}

export interface PolicyConfiguration {
  readonly versionId: EvolutionVersionId;
  readonly actionClassifications: Readonly<Record<string, ActionClassification>>;
  readonly guardrails: Readonly<PolicyGuardrailConfig>;
  readonly activeSince: number;
  readonly checksum: string;
}

export interface PolicySnapshot {
  readonly snapshotId: PolicySnapshotId;
  readonly configuration: Readonly<PolicyConfiguration>;
  readonly userPartition: string;
  readonly createdAt: number;
}

// ============================================================================
// PROPOSAL & REFINEMENT CONTRACTS
// HỢP ĐỒNG ĐỀ XUẤT & TINH CHỈNH CHÍNH SÁCH
// ============================================================================

export type PolicyProposalStatus =
  | 'DRAFT'
  | 'SIMULATED'
  | 'CALIBRATED'
  | 'STAGED_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'ROLLED_BACK';

export interface PolicyDiff {
  readonly addedClassifications: Readonly<Record<string, ActionClassification>>;
  readonly modifiedClassifications: Readonly<Record<string, ActionClassification>>;
  readonly modifiedGuardrails: Readonly<Partial<PolicyGuardrailConfig>>;
}

export interface PolicyEvolutionProposal {
  readonly proposalId: PolicyProposalId;
  readonly sourceAdvisoryIds: readonly string[];
  readonly sourceIncidentIds: readonly string[];
  readonly baseVersionId: EvolutionVersionId;
  readonly candidatePolicyDiff: Readonly<PolicyDiff>;
  readonly affectedPolicyFields: readonly string[];
  readonly rationale: string;
  readonly evidenceSummary: string;
  readonly expectedOperationalImprovement: string;
  readonly expectedSafetyImpact: string;
  readonly confidence: number; // Strictly bounded [0.05, 0.95]
  readonly riskClassification: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly status: PolicyProposalStatus;
  readonly createdAt: number;
}

// ============================================================================
// COUNTERFACTUAL SIMULATION CONTRACTS
// HỢP ĐỒNG MÔ PHỎNG PHẢN THỰC TẾ
// ============================================================================

export interface CounterfactualSimulationResult {
  readonly simulationId: SimulationId;
  readonly proposalId: PolicyProposalId;
  readonly replayedIncidentsCount: number;
  readonly simulatedMttrDeltaMs: number; // Negative is faster MTTR
  readonly simulatedRecoverySuccessRateDelta: number; // Positive is higher success
  readonly simulatedSafetyRegressionsCount: number;
  readonly simulatedGateFrictionDelta: number;
  readonly affectedCategories: readonly string[];
  readonly affectedTargets: readonly string[];
  readonly uncertaintyBound: number;
  readonly isCounterfactualSimulation: true;
  readonly evaluatedAt: number;
}

// ============================================================================
// GUARDRAIL CALIBRATION CONTRACTS
// HỢP ĐỒNG HIỆU CHUẨN BIÊN GIỚI BẢO VỆ
// ============================================================================

export interface GuardrailCalibrationResult {
  readonly passed: boolean;
  readonly safetyMarginScore: number; // Bounded [0.0, 1.0]
  readonly violatesForbiddenProtection: boolean;
  readonly violatesGateStrictness: boolean;
  readonly erosionDetected: boolean;
  readonly rejectionReasons: readonly string[];
  readonly calibratedAt: number;
}

// ============================================================================
// REVIEW, AUTHORIZATION & ROLLOUT CONTRACTS
// HỢP ĐỒNG ĐÁNH GIÁ, ỦY QUYỀN & TRIỂN KHAI
// ============================================================================

export interface PolicyReviewRecord {
  readonly reviewId: ReviewId;
  readonly proposalId: PolicyProposalId;
  readonly decision: 'APPROVED' | 'REJECTED';
  readonly reviewedBy: string; // Must be verified human operator, never 'AGENT'
  readonly reviewNotes: string;
  readonly authorizationToken?: AuthorizationToken;
  readonly reviewedAt: number;
}

export interface PolicyRolloutRecord {
  readonly rolloutId: RolloutId;
  readonly proposalId: PolicyProposalId;
  readonly fromVersionId: EvolutionVersionId;
  readonly toVersionId: EvolutionVersionId;
  readonly preRolloutSnapshotId: PolicySnapshotId;
  readonly verificationOutcome: boolean;
  readonly appliedAt: number;
}

export interface PolicyRollbackRecord {
  readonly rollbackId: RollbackId;
  readonly rolloutId: RolloutId;
  readonly revertedToVersionId: EvolutionVersionId;
  readonly rollbackReason: string;
  readonly rolledBackAt: number;
}

// ============================================================================
// CRYPTOGRAPHIC EVOLUTION PROVENANCE CONTRACTS
// HỢP ĐỒNG NGUỒN GỐC TIẾN HÓA MẬT MÃ
// ============================================================================

export interface PolicyEvolutionProvenanceRecord {
  readonly provenanceId: PolicyEvolutionProvenanceId;
  readonly proposalId: PolicyProposalId;
  readonly baseVersionHash: string;
  readonly diffHash: string;
  readonly simulationHash: string;
  readonly guardrailHash: string;
  readonly reviewHash: string;
  readonly provenanceSha256: string;
  readonly timestamp: number;
}
