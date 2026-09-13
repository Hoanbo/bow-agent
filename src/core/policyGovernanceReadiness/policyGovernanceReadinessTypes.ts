// src/core/policyGovernanceReadiness/policyGovernanceReadinessTypes.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Canonical Contracts & DTOs (Component 855).
// Defines branded types, readiness criteria structures, evidence records,
// multi-dimensional assessment reports, and non-authoritative phase exit declarations.
//
// Core Authority Invariants:
// - READINESS_ASSESSMENT != POLICY_AUTHORITY
// - READINESS_ASSESSMENT != POLICY_MUTATION
// - READINESS_ASSESSMENT != PHASE_COMPLETION_AUTHORITY
// - READINESS_ASSESSMENT != AUTONOMOUS_REMEDIATION
// - READINESS_ASSESSMENT != AUTONOMOUS_PHASE_EXIT
// - PHASE_EXIT_DECLARATION === 'HUMAN_AUTHORITY_REQUIRED' (ALWAYS)
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO DIRECT TOOL EXECUTION
// - FAIL_CLOSED

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type AssessmentId = string & { readonly __brand: unique symbol };
export type CriterionId = string & { readonly __brand: unique symbol };
export type EvidenceId = string & { readonly __brand: unique symbol };
export type ReadinessReportId = string & { readonly __brand: unique symbol };
export type ReadinessProvenanceId = string & { readonly __brand: unique symbol };

export function createAssessmentId(raw: string): AssessmentId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ASSESSMENT_ID: raw id must be a non-empty string');
  }
  return raw.trim() as AssessmentId;
}

export function createCriterionId(raw: string): CriterionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_CRITERION_ID: raw id must be a non-empty string');
  }
  return raw.trim() as CriterionId;
}

export function createEvidenceId(raw: string): EvidenceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_EVIDENCE_ID: raw id must be a non-empty string');
  }
  return raw.trim() as EvidenceId;
}

export function createReadinessReportId(raw: string): ReadinessReportId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_READINESS_REPORT_ID: raw id must be a non-empty string');
  }
  return raw.trim() as ReadinessReportId;
}

export function createReadinessProvenanceId(raw: string): ReadinessProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_READINESS_PROVENANCE_ID: raw id must be a non-empty string');
  }
  return raw.trim() as ReadinessProvenanceId;
}

// ============================================================================
// STATUS & CLASSIFICATION TAXONOMY
// ============================================================================

export type CriterionStatus =
  | 'PASS'
  | 'FAIL'
  | 'PARTIAL'
  | 'NOT_TESTED'
  | 'NOT_APPLICABLE';

export type ReadinessStatus =
  | 'READY_FOR_PHASE_EXIT'
  | 'NOT_READY_FOR_PHASE_EXIT';

export type PhaseExitRecommendation =
  | 'RECOMMENDED'
  | 'NOT_RECOMMENDED';

/**
 * Phase Exit Declaration is IMMUTABLE and ALWAYS requires explicit human authority.
 * Autonomous phase exit or completion declaration is strictly forbidden.
 */
export type PhaseExitDeclaration = 'HUMAN_AUTHORITY_REQUIRED';

export const PHASE_EXIT_DECLARATION_VALUE: PhaseExitDeclaration = 'HUMAN_AUTHORITY_REQUIRED';

export type EvidenceType =
  | 'REPOSITORY_CODE'
  | 'AUTOMATED_TEST'
  | 'RUNTIME_EXECUTION'
  | 'SECURITY_SCAN'
  | 'ARCHITECTURAL_INVARIANT'
  | 'CRYPTOGRAPHIC_PROVENANCE'
  | 'AUDIT_TRAIL';

export type GovernanceLayer =
  | 'OBSERVABILITY'
  | 'EVIDENCE_INVESTIGATION'
  | 'DECISION_PROPOSAL'
  | 'REMEDIATION_PLANNING'
  | 'HUMAN_AUTHORIZATION'
  | 'EXECUTION_DISPATCH'
  | 'OUTCOME_VERIFICATION'
  | 'POST_EXECUTION_RECONCILIATION'
  | 'FEEDBACK_REVIEW'
  | 'EVOLUTION_PLANNING'
  | 'CANDIDATE_SYNTHESIS'
  | 'CANDIDATE_VALIDATION'
  | 'CANDIDATE_AUTHORIZATION'
  | 'STAGED_ACTIVATION'
  | 'RUNTIME_SYNCHRONIZATION'
  | 'PDP_ENFORCEMENT'
  | 'PEP_ENFORCEMENT'
  | 'ROLLBACK_SUNSET_RECOVERY'
  | 'LIFECYCLE_RECONCILIATION'
  | 'INCIDENT_RESPONSE'
  | 'CONTAINMENT_CLEARANCE'
  | 'RECOVERY_AUTHORIZATION'
  | 'RECOVERY_VERIFICATION'
  | 'INCIDENT_RESOLUTION'
  | 'INCIDENT_CLOSURE';

export type IntegrationRealityStatus =
  | 'REAL_COMPONENT'
  | 'CONNECTED_COMPONENT'
  | 'EXECUTABLE_PATH'
  | 'TESTED_PATH'
  | 'PRODUCTION_REACHABLE_PATH';

// ============================================================================
// CRITERION DEFINITION & EVIDENCE CONTRACTS
// ============================================================================

export interface ReadinessCriterionDefinition {
  readonly criterionId: CriterionId;
  readonly criterionNumber: number;
  readonly name: string;
  readonly description: string;
  readonly isMandatory: boolean;
  readonly derivation: 'DERIVED_FROM_EXISTING_ARCHITECTURE';
  readonly requiredLayers: readonly GovernanceLayer[];
  readonly targetInvariants: readonly string[];
}

export interface CriterionEvidenceRecord {
  readonly evidenceId: EvidenceId;
  readonly criterionId: CriterionId;
  readonly status: CriterionStatus;
  readonly evidenceType: EvidenceType;
  readonly sourceFiles: readonly string[];
  readonly testEvidence: readonly string[];
  readonly runtimeEvidence: readonly string[];
  readonly securityEvidence: readonly string[];
  readonly reason: string;
  readonly risk: string;
  readonly requiresHumanReview: boolean;
  readonly verifiedAt: string;
}

export interface CriterionEvaluationResult {
  readonly criterion: ReadinessCriterionDefinition;
  readonly status: CriterionStatus;
  readonly evidence: CriterionEvidenceRecord;
}

// ============================================================================
// INSPECTION FINDINGS CONTRACTS
// ============================================================================

export interface RepositoryInspectionFinding {
  readonly totalComponents: number;
  readonly realComponents: number;
  readonly partialComponents: number;
  readonly mockComponents: number;
  readonly ms62Through75Components: number;
  readonly orphanComponents: readonly string[];
  readonly deadExports: readonly string[];
  readonly missingExports: readonly string[];
  readonly matrixConsistent: boolean;
}

export interface IntegrationPathFinding {
  readonly pathName: string;
  readonly stages: readonly string[];
  readonly isConnected: boolean;
  readonly isExecutable: boolean;
  readonly isTested: boolean;
  readonly breaksAtStage?: string;
  readonly reason?: string;
}

export interface SecurityInspectionFinding {
  readonly forbiddenPrimitiveViolations: readonly string[];
  readonly authorityLeakageViolations: readonly string[];
  readonly directPolicyMutationPaths: readonly string[];
  readonly autonomousBypasses: readonly string[];
  readonly isClean: boolean;
}

export interface AuthorityInspectionFinding {
  readonly nonBypassableHumanBoundaries: readonly string[];
  readonly antiSelfApprovalVerified: boolean;
  readonly autonomousPersonasDenied: boolean;
  readonly humanAuthorityPrecedenceVerified: boolean;
  readonly userStopDominanceVerified: boolean;
}

export interface TenantInspectionFinding {
  readonly partitionIsolationVerified: boolean;
  readonly pathTraversalBlocked: boolean;
  readonly nullByteBlocked: boolean;
  readonly reservedDeviceNamesBlocked: boolean;
  readonly crossTenantAccessBlocked: boolean;
}

export interface ProvenanceInspectionFinding {
  readonly chainsVerified: readonly string[];
  readonly tamperEvident: boolean;
  readonly appendOnlyVerified: boolean;
  readonly crossLinkingVerified: boolean;
}

export interface AuditInspectionFinding {
  readonly ledgerIntegrated: boolean;
  readonly secretSanitizationVerified: boolean;
  readonly auditDomainsCovered: readonly string[];
}

// ============================================================================
// READINESS ASSESSMENT REPORT CONTRACT
// ============================================================================

export interface ComponentMatrixSummary {
  readonly totalComponents: number;
  readonly real: number;
  readonly partial: number;
  readonly mock: number;
  readonly realPercentage: number;
}

export interface ReadinessAssessmentReport {
  readonly reportId: ReadinessReportId;
  readonly assessmentId: AssessmentId;
  readonly tenantId: string;
  readonly timestamp: string;
  readonly repositoryRevision?: string;
  readonly componentMatrixSummary: ComponentMatrixSummary;
  readonly governanceCoverage: {
    readonly totalLayers: number;
    readonly coveredLayers: number;
    readonly missingLayers: readonly string[];
  };
  readonly criteriaResults: readonly CriterionEvaluationResult[];
  readonly passedCriteria: readonly CriterionId[];
  readonly failedCriteria: readonly CriterionId[];
  readonly partialCriteria: readonly CriterionId[];
  readonly untestedCriteria: readonly CriterionId[];
  readonly integrationFindings: readonly IntegrationPathFinding[];
  readonly securityFindings: SecurityInspectionFinding;
  readonly authorityFindings: AuthorityInspectionFinding;
  readonly tenantFindings: TenantInspectionFinding;
  readonly provenanceFindings: ProvenanceInspectionFinding;
  readonly auditFindings: AuditInspectionFinding;
  readonly runtimeFindings: {
    readonly pdpPepBridgeOperational: boolean;
    readonly lifecycleConsistencyOperational: boolean;
    readonly incidentResolutionOperational: boolean;
  };
  readonly unresolvedRisks: readonly string[];
  readonly requiredHumanActions: readonly string[];
  readonly readinessStatus: ReadinessStatus;
  readonly phaseExitRecommendation: PhaseExitRecommendation;
  readonly phaseExitDeclaration: PhaseExitDeclaration;
  readonly provenanceHash: string;
}

export interface ReadinessProvenanceRecord {
  readonly provenanceId: ReadinessProvenanceId;
  readonly reportId: ReadinessReportId;
  readonly assessmentId: AssessmentId;
  readonly tenantId: string;
  readonly timestamp: string;
  readonly sha256: string;
  readonly previousHash?: string;
}

export interface PolicyGovernanceReadinessOptions {
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly repositoryRoot?: string;
  readonly customEvaluationOverrides?: Readonly<Record<string, CriterionStatus>>;
}
