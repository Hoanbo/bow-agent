import type { ActionClassification } from '../policyDecisionPoint.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export type PolicyProposalId = string & {
    readonly __brand: unique symbol;
};
export type SimulationId = string & {
    readonly __brand: unique symbol;
};
export type EvolutionVersionId = string & {
    readonly __brand: unique symbol;
};
export type PolicySnapshotId = string & {
    readonly __brand: unique symbol;
};
export type ReviewId = string & {
    readonly __brand: unique symbol;
};
export type RolloutId = string & {
    readonly __brand: unique symbol;
};
export type RollbackId = string & {
    readonly __brand: unique symbol;
};
export type PolicyEvolutionProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createPolicyProposalId(raw: string): PolicyProposalId;
export declare function createSimulationId(raw: string): SimulationId;
export declare function createEvolutionVersionId(raw: string): EvolutionVersionId;
export declare function createPolicySnapshotId(raw: string): PolicySnapshotId;
export declare function createReviewId(raw: string): ReviewId;
export declare function createRolloutId(raw: string): RolloutId;
export declare function createRollbackId(raw: string): RollbackId;
export declare function createPolicyEvolutionProvenanceId(raw: string): PolicyEvolutionProvenanceId;
export interface PolicyGuardrailConfig {
    readonly minApprovalTimeoutMs: number;
    readonly maxRetries: number;
    readonly errorBudgetThreshold: number;
    readonly canaryObservationWindowMinutes: number;
    readonly allowAutonomousDegradation: false;
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
export type PolicyProposalStatus = 'DRAFT' | 'SIMULATED' | 'CALIBRATED' | 'STAGED_FOR_REVIEW' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'ROLLED_BACK';
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
    readonly confidence: number;
    readonly riskClassification: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly status: PolicyProposalStatus;
    readonly createdAt: number;
}
export interface CounterfactualSimulationResult {
    readonly simulationId: SimulationId;
    readonly proposalId: PolicyProposalId;
    readonly replayedIncidentsCount: number;
    readonly simulatedMttrDeltaMs: number;
    readonly simulatedRecoverySuccessRateDelta: number;
    readonly simulatedSafetyRegressionsCount: number;
    readonly simulatedGateFrictionDelta: number;
    readonly affectedCategories: readonly string[];
    readonly affectedTargets: readonly string[];
    readonly uncertaintyBound: number;
    readonly isCounterfactualSimulation: true;
    readonly evaluatedAt: number;
}
export interface GuardrailCalibrationResult {
    readonly passed: boolean;
    readonly safetyMarginScore: number;
    readonly violatesForbiddenProtection: boolean;
    readonly violatesGateStrictness: boolean;
    readonly erosionDetected: boolean;
    readonly rejectionReasons: readonly string[];
    readonly calibratedAt: number;
}
export interface PolicyReviewRecord {
    readonly reviewId: ReviewId;
    readonly proposalId: PolicyProposalId;
    readonly decision: 'APPROVED' | 'REJECTED';
    readonly reviewedBy: string;
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
