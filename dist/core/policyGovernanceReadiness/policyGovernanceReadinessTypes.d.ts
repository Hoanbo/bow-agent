export type AssessmentId = string & {
    readonly __brand: unique symbol;
};
export type CriterionId = string & {
    readonly __brand: unique symbol;
};
export type EvidenceId = string & {
    readonly __brand: unique symbol;
};
export type ReadinessReportId = string & {
    readonly __brand: unique symbol;
};
export type ReadinessProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createAssessmentId(raw: string): AssessmentId;
export declare function createCriterionId(raw: string): CriterionId;
export declare function createEvidenceId(raw: string): EvidenceId;
export declare function createReadinessReportId(raw: string): ReadinessReportId;
export declare function createReadinessProvenanceId(raw: string): ReadinessProvenanceId;
export type CriterionStatus = 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_TESTED' | 'NOT_APPLICABLE';
export type ReadinessStatus = 'READY_FOR_PHASE_EXIT' | 'NOT_READY_FOR_PHASE_EXIT';
export type PhaseExitRecommendation = 'RECOMMENDED' | 'NOT_RECOMMENDED';
/**
 * Phase Exit Declaration is IMMUTABLE and ALWAYS requires explicit human authority.
 * Autonomous phase exit or completion declaration is strictly forbidden.
 */
export type PhaseExitDeclaration = 'HUMAN_AUTHORITY_REQUIRED';
export declare const PHASE_EXIT_DECLARATION_VALUE: PhaseExitDeclaration;
export type EvidenceType = 'REPOSITORY_CODE' | 'AUTOMATED_TEST' | 'RUNTIME_EXECUTION' | 'SECURITY_SCAN' | 'ARCHITECTURAL_INVARIANT' | 'CRYPTOGRAPHIC_PROVENANCE' | 'AUDIT_TRAIL';
export type GovernanceLayer = 'OBSERVABILITY' | 'EVIDENCE_INVESTIGATION' | 'DECISION_PROPOSAL' | 'REMEDIATION_PLANNING' | 'HUMAN_AUTHORIZATION' | 'EXECUTION_DISPATCH' | 'OUTCOME_VERIFICATION' | 'POST_EXECUTION_RECONCILIATION' | 'FEEDBACK_REVIEW' | 'EVOLUTION_PLANNING' | 'CANDIDATE_SYNTHESIS' | 'CANDIDATE_VALIDATION' | 'CANDIDATE_AUTHORIZATION' | 'STAGED_ACTIVATION' | 'RUNTIME_SYNCHRONIZATION' | 'PDP_ENFORCEMENT' | 'PEP_ENFORCEMENT' | 'ROLLBACK_SUNSET_RECOVERY' | 'LIFECYCLE_RECONCILIATION' | 'INCIDENT_RESPONSE' | 'CONTAINMENT_CLEARANCE' | 'RECOVERY_AUTHORIZATION' | 'RECOVERY_VERIFICATION' | 'INCIDENT_RESOLUTION' | 'INCIDENT_CLOSURE';
export type IntegrationRealityStatus = 'REAL_COMPONENT' | 'CONNECTED_COMPONENT' | 'EXECUTABLE_PATH' | 'TESTED_PATH' | 'PRODUCTION_REACHABLE_PATH';
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
