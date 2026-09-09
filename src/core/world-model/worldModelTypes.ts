// src/core/world-model/worldModelTypes.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// Canonical data contracts, type envelopes, epistemic provenance definitions,
// and invariants for the Master Owner World Model and Self-Awareness Subsystem.
//
// INVARIANTS:
// MASTER_OWNER_AUTHORITY > BOW > BOWCON > OPTIONAL_PROJECT_INTEGRATIONS
// OWNER_DECISION > BOWCON_RECOMMENDATION
// BOWCON_OPINION != AUTHORITY
// BOWCON_CONFIDENCE != AUTHORITY
// BOWCON_INTELLIGENCE != AUTHORITY
// BOWCON_AUTONOMY != OWNERSHIP
// CHALLENGE != AUTHORITY
// RECOMMENDATION != EXECUTION
// PREDICTION != FACT
// INFERENCE != FACT
// MEMORY != TRUTH
// VERIFICATION != AUTHORIZATION
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// USER_STOP > EVERYTHING_AUTONOMOUS
// C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import type { HostEnvironment } from '../host/hostEnvironmentTypes.js';

// ---------------------------------------------------------------------------
// Epistemic Provenance Categories
// ---------------------------------------------------------------------------
export type EpistemicProvenance =
  | 'DIRECT_OBSERVATION'    // Directly observed live host state or runtime telemetry
  | 'HOST_TELEMETRY'        // Measured system telemetry (PID, memory, CPU, OS platform)
  | 'VERIFIED_EXECUTION'    // Output of execution verified by hash or cryptographic signature
  | 'VERIFIED_OUTCOME'      // Explicit post-condition verification passed
  | 'OWNER_STATED'          // Directly spoken/instructed by Master Owner
  | 'OWNER_CONFIRMED'       // Explicitly affirmed/approved by Master Owner
  | 'PERSISTED_MEMORY'      // Recalled from durable memory store (subject to re-verification)
  | 'INFERENCE'             // Deduced through reasoning from other premises (NOT fact)
  | 'ASSUMPTION'            // Working premise taken without direct proof (NOT fact)
  | 'HYPOTHESIS'            // Testable conjecture awaiting evidence (NOT fact)
  | 'UNKNOWN'               // Explicitly measured or identified as unknown
  | 'CONTRADICTED';         // Conflicted state requiring resolution

export const EPISTEMIC_EVIDENCE_HIERARCHY: Record<EpistemicProvenance, number> = {
  DIRECT_OBSERVATION: 10,
  HOST_TELEMETRY: 9,
  VERIFIED_EXECUTION: 8,
  VERIFIED_OUTCOME: 7,
  OWNER_CONFIRMED: 6,
  OWNER_STATED: 5,
  PERSISTED_MEMORY: 4,
  INFERENCE: 3,
  HYPOTHESIS: 2,
  ASSUMPTION: 1,
  UNKNOWN: 0,
  CONTRADICTED: -1,
};

/**
 * Validates whether an item with the given provenance is allowed to be treated as an authoritative fact.
 * Only verified direct observations, telemetry, execution outcomes, and owner confirmations qualify.
 */
export function isAuthoritativeFactProvenance(provenance: EpistemicProvenance): boolean {
  return (
    provenance === 'DIRECT_OBSERVATION' ||
    provenance === 'HOST_TELEMETRY' ||
    provenance === 'VERIFIED_EXECUTION' ||
    provenance === 'VERIFIED_OUTCOME' ||
    provenance === 'OWNER_CONFIRMED'
  );
}

/**
 * Asserts that promotion between epistemic categories adheres to strict epistemological discipline.
 * Silently upgrading inferences, assumptions, hypotheses, or memories to facts is strictly forbidden.
 */
export function assertValidEpistemicPromotion(from: EpistemicProvenance, to: EpistemicProvenance): void {
  if (to === 'DIRECT_OBSERVATION' || to === 'HOST_TELEMETRY' || to === 'VERIFIED_EXECUTION' || to === 'VERIFIED_OUTCOME') {
    if (!isAuthoritativeFactProvenance(from)) {
      throw new Error(
        `EPISTEMIC_VIOLATION: Cannot elevate "${from}" to authoritative fact status "${to}" without direct empirical verification.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 12-Facet BOWCON Self-Model Contract
// ---------------------------------------------------------------------------
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
  readonly whatIKnow: Map<string, WorldModelEpistemicItem>;                  // Authoritative facts only
  readonly whatIObserved: Map<string, WorldModelEpistemicItem>;              // Live observations
  readonly whatIInferred: Map<string, WorldModelEpistemicItem>;              // Inferences with premises
  readonly whatIRemember: Map<string, WorldModelEpistemicItem>;              // Recalled durable memory
  readonly whatIExpect: Map<string, WorldModelEpistemicItem>;                // Anticipated action outcomes
  readonly whatIAssume: Map<string, WorldModelEpistemicItem>;                // Explicit assumptions
  readonly whatIDoNotKnow: Map<string, WorldModelEpistemicItem>;             // Explicit unknown states
  readonly whatICannotMeasure: Map<string, WorldModelEpistemicItem>;         // Telemetry unmeasurable on host
  readonly whatICannotExecute: Map<string, WorldModelEpistemicItem>;         // Capabilities missing on host
  readonly whatIAmNotAuthorizedToExecute: Map<string, WorldModelEpistemicItem>; // Capabilities lacking token
  readonly whatIHaveVerified: Map<string, WorldModelEpistemicItem>;          // Independently verified outcomes
  readonly whatIHaveNotVerified: Map<string, WorldModelEpistemicItem>;       // Outputs pending verification
}

// ---------------------------------------------------------------------------
// Capability-Grounded Feasibility Contract
// ---------------------------------------------------------------------------
export type CapabilityPlanStatus =
  | 'PLAN_POSSIBLE'
  | 'PLAN_CONDITIONALLY_POSSIBLE'
  | 'PLAN_BLOCKED'
  | 'PLAN_UNKNOWN';

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

// ---------------------------------------------------------------------------
// Information Gap Contract
// ---------------------------------------------------------------------------
export type GapCategory =
  | 'MISSING_CAPABILITY'
  | 'MISSING_TELEMETRY'
  | 'MISSING_PROJECT_STATE'
  | 'MISSING_OWNER_DECISION'
  | 'MISSING_EXECUTION_EVIDENCE'
  | 'MISSING_VERIFICATION_EVIDENCE'
  | 'CONFLICTING_INFORMATION'
  | 'EXPIRED_INFORMATION';

export interface InformationGap {
  readonly gapId: string;
  readonly category: GapCategory;
  readonly description: string;
  readonly impact: string;
  readonly isUnknownNotFalse: boolean;              // UNKNOWN != FALSE
  readonly isNotAvailableNotUnauthorized: boolean;  // NOT_AVAILABLE != NOT_AUTHORIZED
  readonly detectedAt: number;
  readonly resolutionRequirement: string;
  resolved: boolean;
}

// ---------------------------------------------------------------------------
// Contradiction Contract
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Self-Correction Contract
// ---------------------------------------------------------------------------
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


// ---------------------------------------------------------------------------
// Master Owner World Model Snapshot Contract
// ---------------------------------------------------------------------------
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
