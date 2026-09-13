// src/core/policyPhaseExitAudit/policyPhaseExitAuditTypes.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Canonical Contracts & Branded Types (Component 884).
// Defines branded identifiers, evidence strength taxonomy, criterion status models,
// readiness states, and immutable audit assessment report envelopes.
//
// Core Authority Invariants:
// - EVIDENCE != READINESS
// - READINESS != AUTHORIZATION
// - AUTHORIZATION != COMMIT
// - AUDIT != POLICY_AUTHORITY
// - AUDIT != POLICY_MUTATION
// - READINESS_ASSESSMENT != PHASE_EXIT
// - PHASE_EXIT != PHASE_1_4_ENTRY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS PHASE EXIT
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type PhaseExitAuditId = string & { readonly __brand: unique symbol };
export type AuditEvidenceId = string & { readonly __brand: unique symbol };
export type AuditCriterionId = string & { readonly __brand: unique symbol };
export type AuditReportId = string & { readonly __brand: unique symbol };
export type AuditProvenanceId = string & { readonly __brand: unique symbol };

export function createPhaseExitAuditId(raw: string): PhaseExitAuditId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_AUDIT_ID: raw audit id must be a non-empty string');
  }
  return raw.trim() as PhaseExitAuditId;
}

export function createAuditEvidenceId(raw: string): AuditEvidenceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_AUDIT_EVIDENCE_ID: raw evidence id must be a non-empty string');
  }
  return raw.trim() as AuditEvidenceId;
}

export function createAuditCriterionId(raw: string): AuditCriterionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_AUDIT_CRITERION_ID: raw criterion id must be a non-empty string');
  }
  return raw.trim() as AuditCriterionId;
}

export function createAuditReportId(raw: string): AuditReportId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_AUDIT_REPORT_ID: raw report id must be a non-empty string');
  }
  return raw.trim() as AuditReportId;
}

export function createAuditProvenanceId(raw: string): AuditProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_AUDIT_PROVENANCE_ID: raw provenance id must be a non-empty string');
  }
  return raw.trim() as AuditProvenanceId;
}

// ============================================================================
// EVIDENCE STRENGTH TAXONOMY
// ============================================================================

export type EvidenceStrength =
  | 'DIRECT_RUNTIME_EVIDENCE'
  | 'DIRECT_TEST_EVIDENCE'
  | 'STATIC_CODE_EVIDENCE'
  | 'INTEGRATION_EVIDENCE'
  | 'REGRESSION_EVIDENCE'
  | 'SECURITY_SCAN_EVIDENCE'
  | 'PROVENANCE_EVIDENCE'
  | 'AUDIT_LEDGER_EVIDENCE'
  | 'DERIVED_EVIDENCE'
  | 'CLAIM_ONLY';

export type EvidenceVerificationMethod =
  | 'AST_SOURCE_INSPECTION'
  | 'RUNTIME_EXECUTION'
  | 'DEDICATED_REALITY_TEST'
  | 'FULL_REGRESSION_RUN'
  | 'SECURITY_SCAN'
  | 'PROVENANCE_CHAIN_VERIFICATION'
  | 'AUDIT_LEDGER_INSPECTION'
  | 'TENANT_ISOLATION_PROBE'
  | 'PROTECTED_WORKSPACE_PROBE'
  | 'ANTI_CIRCULARITY_ANALYSIS';

// ============================================================================
// CRITERION STATUS & READINESS STATES
// ============================================================================

export type AuditCriterionStatus =
  | 'PASS'
  | 'FAIL'
  | 'PARTIAL'
  | 'UNTESTED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CIRCULAR_EVIDENCE'
  | 'CONFLICTING_EVIDENCE'
  | 'BLOCKED_BY_USER_STOP';

export type AuditReadinessStatus =
  | 'READY_FOR_PHASE_EXIT_REVIEW'
  | 'NOT_READY'
  | 'READY_WITH_RESTRICTIONS'
  | 'BLOCKED';

export type GovernanceMilestone =
  | 'MS-1.3.62'
  | 'MS-1.3.63'
  | 'MS-1.3.64'
  | 'MS-1.3.65'
  | 'MS-1.3.66'
  | 'MS-1.3.67'
  | 'MS-1.3.68'
  | 'MS-1.3.69'
  | 'MS-1.3.70'
  | 'MS-1.3.71'
  | 'MS-1.3.72'
  | 'MS-1.3.73'
  | 'MS-1.3.74'
  | 'MS-1.3.75'
  | 'MS-1.3.76'
  | 'MS-1.3.77'
  | 'MS-1.3.78';

// ============================================================================
// EVIDENCE CONTRACTS
// ============================================================================

export interface AuditEvidenceItem {
  readonly evidenceId: AuditEvidenceId;
  readonly criterionId: AuditCriterionId;
  readonly milestone?: GovernanceMilestone;
  readonly evidenceSource: string;
  readonly evidenceStrength: EvidenceStrength;
  readonly verificationMethod: EvidenceVerificationMethod;
  readonly observedValue: string;
  readonly expectedValue: string;
  readonly verified: boolean;
  readonly collectedAt: string;
  readonly details?: Record<string, any>;
}

export interface AuditCriterionDefinition {
  readonly criterionId: AuditCriterionId;
  readonly criterionNumber: number;
  readonly name: string;
  readonly description: string;
  readonly requiredStrength: EvidenceStrength;
  readonly isMandatory: boolean;
  readonly targetMilestones: readonly GovernanceMilestone[];
}

export interface AuditCriterionEvaluation {
  readonly criterion: AuditCriterionDefinition;
  readonly status: AuditCriterionStatus;
  readonly evidenceItems: readonly AuditEvidenceItem[];
  readonly failureReason?: string;
  readonly riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly independentVerification: boolean;
}

export interface IndependentAuditReport {
  readonly reportId: AuditReportId;
  readonly auditId: PhaseExitAuditId;
  readonly tenantPartition: string;
  readonly assessmentTimestamp: string;
  readonly auditedMilestones: readonly GovernanceMilestone[];
  readonly criteriaEvaluations: readonly AuditCriterionEvaluation[];
  readonly passedCriteriaCount: number;
  readonly totalCriteriaCount: number;
  readonly readinessStatus: AuditReadinessStatus;
  readonly phaseExitAuthorization: 'HUMAN_AUTHORITY_REQUIRED';
  readonly autonomousPhaseExit: 'FORBIDDEN';
  readonly phase14Entry: 'FORBIDDEN';
  readonly unresolvedRisks: readonly string[];
  readonly evidenceCoveragePercentage: number;
  readonly reportHash: string;
}

export interface AuditProvenanceRecord {
  readonly provenanceId: AuditProvenanceId;
  readonly tenantPartition: string;
  readonly auditId: PhaseExitAuditId;
  readonly criterionId?: AuditCriterionId;
  readonly evidenceId?: AuditEvidenceId;
  readonly assessmentStatus: AuditReadinessStatus;
  readonly timestamp: string;
  readonly previousHash: string;
  readonly payloadHash: string;
  readonly recordHash: string;
}

export interface PolicyPhaseExitAuditOptions {
  readonly tenantId?: string;
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
