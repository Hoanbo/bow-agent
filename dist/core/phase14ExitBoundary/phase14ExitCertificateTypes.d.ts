export type Phase14ExitCriterionId = 'CRIT-1.4-01' | 'CRIT-1.4-02' | 'CRIT-1.4-03' | 'CRIT-1.4-04' | 'CRIT-1.4-05' | 'CRIT-1.4-06' | 'CRIT-1.4-07' | 'CRIT-1.4-08' | 'CRIT-1.4-09' | 'CRIT-1.4-10' | 'CRIT-1.4-11' | 'CRIT-1.4-12';
export type Phase14CriterionAuditStatus = 'PASS' | 'FAIL' | 'INCONCLUSIVE';
export type Phase14ExitCertificateStatus = 'EXIT_READY' | 'REJECTED' | 'AUDIT_INCOMPLETE' | 'AUDIT_ABORTED';
export type Phase14EvidenceSource = 'AUDIT_LEDGER' | 'OBSERVABILITY_TRACES' | 'TASK_LIFECYCLE' | 'DURABLE_COMMIT' | 'EPISODIC_MEMORY' | 'REALITY_VERIFICATION' | 'REGRESSION_RECORD' | 'FILESYSTEM_PROBE' | 'SANITY_SCAN';
export interface Phase14EvidenceItem {
    readonly source: Phase14EvidenceSource;
    readonly evidenceId: string;
    readonly tenantId: string;
    readonly observedAtIso: string;
    readonly payloadHash: string;
    readonly data: Readonly<Record<string, unknown>>;
}
export interface Phase14CriterionAuditResult {
    readonly criterionId: Phase14ExitCriterionId;
    readonly name: string;
    readonly status: Phase14CriterionAuditStatus;
    readonly score: number;
    readonly verifiedIndependently: boolean;
    readonly supportingEvidenceIds: readonly string[];
    readonly reconciliationNotes: string;
    readonly evaluatedAtIso: string;
}
export interface Phase14ContradictionFinding {
    readonly criterionId: Phase14ExitCriterionId;
    readonly readinessReportClaim: string;
    readonly independentEvidenceFinding: string;
    readonly severity: 'FATAL_CONTRADICTION' | 'INCONSISTENCY' | 'EVIDENCE_GAP';
    readonly sourceDiscrepancy: string;
}
/**
 * Authentic Cryptographic Provenance Chain Linking MS-1.4.01 through MS-1.4.12
 */
export interface Phase14AuthenticProvenanceManifest {
    readonly ms1401TaskLifecycleHash: string;
    readonly ms1402CognitiveHash: string;
    readonly ms1403ContextHash: string;
    readonly ms1404PlanningHash: string;
    readonly ms1405ActionProposalHash: string;
    readonly ms1406ToolAdapterHash: string;
    readonly ms1407RealityVerificationHash: string;
    readonly ms1408DurableCommitHash: string;
    readonly ms1409EpisodicMemoryHash: string;
    readonly ms1410AgentLoopFacadeHash: string;
    readonly ms1411ObservabilityHash: string;
    readonly ms1412ReadinessHash: string;
    readonly compositeAuditProvenanceHash: string;
    readonly isAuthenticProvenanceVerified: boolean;
}
/**
 * Canonical Phase 1.4 Exit Certificate
 * NOTE: This is an objective technical assessment of readiness.
 * It carries ZERO execution or phase exit authorization authority.
 */
export interface Phase14ExitCertificate {
    readonly certificateId: string;
    readonly tenantId: string;
    readonly auditId: string;
    readonly readinessReportId?: string;
    readonly auditedAtIso: string;
    readonly status: Phase14ExitCertificateStatus;
    readonly allCriteriaPassed: boolean;
    readonly criteriaPassedCount: number;
    readonly criteriaTotalCount: 12;
    readonly criteriaResults: readonly Phase14CriterionAuditResult[];
    readonly contradictions: readonly Phase14ContradictionFinding[];
    readonly provenanceManifest: Phase14AuthenticProvenanceManifest;
    readonly rawEvidenceHashes: readonly string[];
    readonly auditSummary: string;
    readonly disclaimer: 'NON_AUTHORITATIVE_AUDIT_ONLY_REQUIRES_MASTER_HUMAN_GOVERNANCE_DECISION';
    readonly certificateHash: string;
}
export interface Phase14AuditExecutionResult {
    readonly success: boolean;
    readonly certificate: Phase14ExitCertificate;
    readonly error?: {
        readonly code: string;
        readonly message: string;
    } | null;
}
export declare const CANONICAL_EXIT_CRITERIA_METADATA: Readonly<Record<Phase14ExitCriterionId, {
    name: string;
    description: string;
}>>;
/**
 * Typed Error Hierarchy
 */
export declare class Phase14ExitBoundaryError extends Error {
    readonly code: string;
    constructor(message: string, code?: string);
}
export declare class Phase14AuditAbortedError extends Phase14ExitBoundaryError {
    readonly reason: string;
    constructor(reason: string);
}
export declare class Phase14ValidationError extends Phase14ExitBoundaryError {
    constructor(message: string);
}
export declare class Phase14SecurityError extends Phase14ExitBoundaryError {
    constructor(message: string);
}
export declare class Phase14ProvenanceMismatchError extends Phase14ExitBoundaryError {
    constructor(message: string);
}
export declare class Phase14ContradictionError extends Phase14ExitBoundaryError {
    constructor(message: string);
}
/**
 * Deeply freeze an object recursively to guarantee immutability
 */
export declare function deepFreeze<T>(obj: T): T;
