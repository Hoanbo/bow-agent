import type { ReadinessAssessmentReport, ReadinessReportId, AssessmentId } from '../policyGovernanceReadiness/policyGovernanceReadinessTypes.js';
import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
export type PhaseExitCandidateId = string & {
    readonly __brand: unique symbol;
};
export type PhaseExitAuthorizationId = string & {
    readonly __brand: unique symbol;
};
export type PhaseExitCommitId = string & {
    readonly __brand: unique symbol;
};
export type Phase14EntryReadinessId = string & {
    readonly __brand: unique symbol;
};
export type Phase14EntryAuthorizationId = string & {
    readonly __brand: unique symbol;
};
export type Phase14EntryCommitId = string & {
    readonly __brand: unique symbol;
};
export type PhaseTransitionProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createPhaseExitCandidateId(raw: string): PhaseExitCandidateId;
export declare function createPhaseExitAuthorizationId(raw: string): PhaseExitAuthorizationId;
export declare function createPhaseExitCommitId(raw: string): PhaseExitCommitId;
export declare function createPhase14EntryReadinessId(raw: string): Phase14EntryReadinessId;
export declare function createPhase14EntryAuthorizationId(raw: string): Phase14EntryAuthorizationId;
export declare function createPhase14EntryCommitId(raw: string): Phase14EntryCommitId;
export declare function createPhaseTransitionProvenanceId(raw: string): PhaseTransitionProvenanceId;
export type PhaseState = 'PHASE_1_3_ACTIVE' | 'PHASE_1_3_EXIT_PENDING_REVIEW' | 'PHASE_1_3_EXIT_AUTHORIZED' | 'PHASE_1_3_EXIT_COMMITTED' | 'PHASE_1_4_ENTRY_READY' | 'PHASE_1_4_ENTRY_AUTHORIZED' | 'PHASE_1_4_ENTRY_COMMITTED';
export type PhaseTransitionType = 'PHASE_1_3_EXIT' | 'PHASE_1_4_ENTRY';
export type AuthorizationDecisionStatus = 'AUTHORIZED' | 'REJECTED' | 'CANCELLED';
export interface PhaseExitCandidate {
    readonly candidateId: PhaseExitCandidateId;
    readonly tenantId: string;
    readonly readinessReportId: ReadinessReportId;
    readonly assessmentId: AssessmentId;
    readonly currentPhase: 'PHASE_1_3_ACTIVE';
    readonly targetPhase: 'PHASE_1_3_EXIT_COMMITTED';
    readonly proposedBy: string;
    readonly createdAt: string;
    readonly readinessProvenanceHash: string;
    readonly summary: {
        readonly passedCriteriaCount: number;
        readonly totalCriteriaCount: number;
        readonly unresolvedRisksCount: number;
    };
}
export interface PhaseExitReviewPackage {
    readonly candidate: PhaseExitCandidate;
    readonly readinessReport: ReadinessAssessmentReport;
    readonly criteriaVerified: boolean;
    readonly protectedWorkspaceUntouched: boolean;
    readonly regressionVerified: boolean;
    readonly buildVerified: boolean;
    readonly securityVerified: boolean;
    readonly humanReviewChecklist: readonly string[];
    readonly reviewedAt: string;
}
export interface PhaseExitAuthorizationRequest {
    readonly candidateId: PhaseExitCandidateId;
    readonly tenantId: string;
    readonly requestedBy: string;
    readonly authorizedBy: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly rationale: string;
    readonly decision: 'AUTHORIZE' | 'REJECT';
    readonly timestamp?: string;
}
export interface PhaseExitAuthorizationRecord {
    readonly authorizationId: PhaseExitAuthorizationId;
    readonly candidateId: PhaseExitCandidateId;
    readonly tenantId: string;
    readonly requestedBy: string;
    readonly authorizedBy: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly rationale: string;
    readonly decision: AuthorizationDecisionStatus;
    readonly authorizedAt: string;
    readonly fingerprint: string;
}
export interface PhaseExitCommitRecord {
    readonly commitId: PhaseExitCommitId;
    readonly tenantId: string;
    readonly candidateId: PhaseExitCandidateId;
    readonly authorizationId: PhaseExitAuthorizationId;
    readonly previousPhase: 'PHASE_1_3_ACTIVE' | 'PHASE_1_3_EXIT_PENDING_REVIEW' | 'PHASE_1_3_EXIT_AUTHORIZED';
    readonly committedPhase: 'PHASE_1_3_EXIT_COMMITTED';
    readonly committedAt: string;
    readonly committedBy: string;
    readonly provenanceHash: string;
}
export interface Phase14EntryReadinessRecord {
    readonly readinessId: Phase14EntryReadinessId;
    readonly tenantId: string;
    readonly exitCommitId: PhaseExitCommitId;
    readonly status: 'PHASE_1_4_ENTRY_READY' | 'PHASE_1_4_ENTRY_NOT_READY';
    readonly evaluatedAt: string;
    readonly prerequisitesSatisfied: boolean;
    readonly reasons: readonly string[];
    readonly requiredPrerequisites: readonly string[];
}
export interface Phase14EntryAuthorizationRequest {
    readonly readinessId: Phase14EntryReadinessId;
    readonly tenantId: string;
    readonly requestedBy: string;
    readonly authorizedBy: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly rationale: string;
    readonly decision: 'AUTHORIZE' | 'REJECT';
    readonly timestamp?: string;
}
export interface Phase14EntryAuthorizationRecord {
    readonly authorizationId: Phase14EntryAuthorizationId;
    readonly readinessId: Phase14EntryReadinessId;
    readonly tenantId: string;
    readonly requestedBy: string;
    readonly authorizedBy: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly rationale: string;
    readonly decision: AuthorizationDecisionStatus;
    readonly authorizedAt: string;
    readonly fingerprint: string;
}
export interface Phase14EntryCommitRecord {
    readonly commitId: Phase14EntryCommitId;
    readonly tenantId: string;
    readonly exitCommitId: PhaseExitCommitId;
    readonly entryReadinessId: Phase14EntryReadinessId;
    readonly authorizationId: Phase14EntryAuthorizationId;
    readonly previousPhase: 'PHASE_1_3_EXIT_COMMITTED' | 'PHASE_1_4_ENTRY_READY' | 'PHASE_1_4_ENTRY_AUTHORIZED';
    readonly committedPhase: 'PHASE_1_4_ENTRY_COMMITTED';
    readonly committedAt: string;
    readonly committedBy: string;
    readonly provenanceHash: string;
}
export interface PhaseTransitionProvenanceRecord {
    readonly provenanceId: PhaseTransitionProvenanceId;
    readonly tenantId: string;
    readonly transitionType: PhaseTransitionType;
    readonly targetPhase: PhaseState;
    readonly entityId: string;
    readonly timestamp: string;
    readonly sha256: string;
    readonly previousHash?: string;
}
export interface PolicyPhaseTransitionOptions {
    readonly tenantId: string;
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
