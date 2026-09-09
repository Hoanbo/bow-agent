import type { HostEnvironment } from '../host/hostEnvironmentTypes.js';
export type EpistemicProvenance = 'DIRECT_OBSERVATION' | 'HOST_TELEMETRY' | 'VERIFIED_EXECUTION' | 'VERIFIED_OUTCOME' | 'OWNER_STATED' | 'OWNER_CONFIRMED' | 'PERSISTED_MEMORY' | 'INFERENCE' | 'ASSUMPTION' | 'HYPOTHESIS' | 'UNKNOWN' | 'CONTRADICTED';
export declare const EPISTEMIC_EVIDENCE_HIERARCHY: Record<EpistemicProvenance, number>;
/**
 * Validates whether an item with the given provenance is allowed to be treated as an authoritative fact.
 * Only verified direct observations, telemetry, execution outcomes, and owner confirmations qualify.
 */
export declare function isAuthoritativeFactProvenance(provenance: EpistemicProvenance): boolean;
/**
 * Asserts that promotion between epistemic categories adheres to strict epistemological discipline.
 * Silently upgrading inferences, assumptions, hypotheses, or memories to facts is strictly forbidden.
 */
export declare function assertValidEpistemicPromotion(from: EpistemicProvenance, to: EpistemicProvenance): void;
export interface WorldModelEpistemicItem<T = unknown> {
    readonly id: string;
    readonly key: string;
    readonly value: T;
    readonly provenance: EpistemicProvenance;
    readonly confidence: number;
    readonly timestamp: number;
    readonly source?: string;
    readonly expiresAt?: number;
    readonly isStale?: boolean;
}
export interface BowconSelfModel {
    readonly whatIKnow: Map<string, WorldModelEpistemicItem>;
    readonly whatIObserved: Map<string, WorldModelEpistemicItem>;
    readonly whatIInferred: Map<string, WorldModelEpistemicItem>;
    readonly whatIRemember: Map<string, WorldModelEpistemicItem>;
    readonly whatIExpect: Map<string, WorldModelEpistemicItem>;
    readonly whatIAssume: Map<string, WorldModelEpistemicItem>;
    readonly whatIDoNotKnow: Map<string, WorldModelEpistemicItem>;
    readonly whatICannotMeasure: Map<string, WorldModelEpistemicItem>;
    readonly whatICannotExecute: Map<string, WorldModelEpistemicItem>;
    readonly whatIAmNotAuthorizedToExecute: Map<string, WorldModelEpistemicItem>;
    readonly whatIHaveVerified: Map<string, WorldModelEpistemicItem>;
    readonly whatIHaveNotVerified: Map<string, WorldModelEpistemicItem>;
}
export type CapabilityPlanStatus = 'PLAN_POSSIBLE' | 'PLAN_CONDITIONALLY_POSSIBLE' | 'PLAN_BLOCKED' | 'PLAN_UNKNOWN';
export interface CapabilityPlanFeasibility {
    readonly planId: string;
    readonly status: CapabilityPlanStatus;
    readonly requiredCapabilities: string[];
    readonly availableCapabilities: string[];
    readonly missingCapabilities: string[];
    readonly requiredAuthorizations: string[];
    readonly requiredOwnerActions: string[];
    readonly reasons: string[];
    readonly executionAllowed: boolean;
    readonly assessedAt: number;
}
export type GapCategory = 'MISSING_CAPABILITY' | 'MISSING_TELEMETRY' | 'MISSING_PROJECT_STATE' | 'MISSING_OWNER_DECISION' | 'MISSING_EXECUTION_EVIDENCE' | 'MISSING_VERIFICATION_EVIDENCE' | 'CONFLICTING_INFORMATION' | 'EXPIRED_INFORMATION';
export interface InformationGap {
    readonly gapId: string;
    readonly category: GapCategory;
    readonly description: string;
    readonly impact: string;
    readonly isUnknownNotFalse: boolean;
    readonly isNotAvailableNotUnauthorized: boolean;
    readonly detectedAt: number;
    readonly resolutionRequirement: string;
    resolved: boolean;
}
export type ContradictionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ContradictionStatus = 'UNRESOLVED' | 'RESOLVED_BY_EVIDENCE' | 'OWNER_CONFIRMED';
export interface ContradictionClaim {
    readonly source: string;
    readonly claim: string;
    readonly provenance: EpistemicProvenance;
    readonly timestamp: number;
}
export interface WorldModelContradiction {
    readonly contradictionId: string;
    readonly sourceA: ContradictionClaim;
    readonly sourceB: ContradictionClaim;
    readonly evidence: string;
    readonly confidence: number;
    readonly severity: ContradictionSeverity;
    status: ContradictionStatus;
    readonly ownerConfirmationRequired: boolean;
    readonly detectedAt: number;
    resolvedAt?: number;
}
export interface WorldModelSelfCorrectionRecord {
    readonly correctionId: string;
    readonly originalBelief: string;
    readonly provenanceBefore: EpistemicProvenance;
    readonly newEvidence: string;
    readonly contradictionRef?: string;
    readonly correction: string;
    readonly confidenceBefore: number;
    readonly confidenceAfter: number;
    readonly sourceOfCorrection: string;
    readonly timestamp: number;
}
export interface ProjectModel {
    readonly projectId: string;
    readonly name: string;
    readonly isProtected: boolean;
    readonly relationship: 'PERSONAL' | 'OPTIONAL_SURFACE' | 'FUTURE_APPLICATION';
    readonly goals: string[];
    readonly tasks: string[];
    readonly problems: string[];
    readonly decisions: string[];
    readonly outcomes: string[];
}
export interface VerifiedOutcomeRecord {
    readonly outcomeId: string;
    readonly actionId: string;
    readonly capabilityId: string;
    readonly success: boolean;
    readonly verificationHash: string;
    readonly verifiedAt: number;
    readonly details?: string;
}
export interface MasterOwnerWorldModelSnapshot {
    readonly schemaVersion: '4.0.0';
    readonly ownerId: string;
    readonly ecosystemId: string;
    readonly runtimeIdentity: string;
    readonly timestamp: number;
    readonly personalContext: Record<string, unknown>;
    readonly projects: Record<string, ProjectModel>;
    readonly activeObjectives: string[];
    readonly constraints: string[];
    readonly resources: Record<string, unknown>;
    readonly availableCapabilities: string[];
    readonly hostEnvironment: HostEnvironment;
    readonly currentWork: string[];
    readonly blockers: string[];
    readonly risks: string[];
    readonly contradictions: WorldModelContradiction[];
    readonly openQuestions: string[];
    readonly recentVerifiedOutcomes: VerifiedOutcomeRecord[];
    readonly temporalState: {
        readonly observedAt: number;
        readonly updatedAt: number;
        readonly verifiedAt?: number;
        readonly expiresAt?: number;
        readonly lastKnownGoodAt: number;
        readonly isStale: boolean;
    };
    readonly integrityHash: string;
}
