// src/core/personal-os/personalOsTypes.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Authoritative contracts, types, and schemas for Master Owner Personal OS & Proactive Agency.
//
// Invariants:
// MASTER_OWNER_AUTHORITY > BOWCON_INTELLIGENCE > BOWCON_AUTONOMY
// BOWCON_OPINION != AUTHORITY
// BOWCON_CONFIDENCE != AUTHORITY
// BOWCON_INTELLIGENCE != AUTHORITY
// BOWCON_REASONING != AUTHORITY
// BOWCON_AUTONOMY != OWNERSHIP
// CHALLENGE != AUTHORITY
// RECOMMENDATION != EXECUTION
// LEARNING != AUTHORIZATION
// PREDICTION != FACT
// INFERENCE != MEMORY
// MEMORY != TRUTH
// OWNER_DECISION > BOWCON_RECOMMENDATION
// OWNER_OVERRIDE != BOWCON_FAILURE
// USER_STOP > EVERYTHING_AUTONOMOUS
// PROTECTED_WORKSPACE: C:\BOW\shopofbow -> READS=0, WRITES=0, IMPORTS=0, TOUCHES=0

import { randomBytes } from 'node:crypto';
import {
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  isMasterOwner,
  assertMasterOwner,
  EpistemicCategory,
} from '../partnership/partnershipTypes';

export {
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  isMasterOwner,
  assertMasterOwner,
};

// ---------------------------------------------------------------------------
// 1. Proactive Action Classification (Section 5)
// ---------------------------------------------------------------------------

export type ProactiveActionClass =
  | 'CLASS_A_INFORMATIONAL'
  | 'CLASS_B_REVERSIBLE_INTERNAL'
  | 'CLASS_C_OWNER_DECISION'
  | 'CLASS_D_EXTERNAL_HIGH_RISK';

export const PROACTIVE_ACTION_CLASSES = Object.freeze([
  'CLASS_A_INFORMATIONAL',
  'CLASS_B_REVERSIBLE_INTERNAL',
  'CLASS_C_OWNER_DECISION',
  'CLASS_D_EXTERNAL_HIGH_RISK',
] as const);

export interface ActionClassPolicy {
  readonly autoExecutable: boolean;
  readonly requiresGovernance: boolean;
  readonly requiresOwnerApproval: boolean;
  readonly requiresToken: boolean;
  readonly description: string;
}

export const ACTION_CLASS_POLICIES: Record<ProactiveActionClass, ActionClassPolicy> = Object.freeze({
  CLASS_A_INFORMATIONAL: {
    autoExecutable: true,
    requiresGovernance: false,
    requiresOwnerApproval: false,
    requiresToken: false,
    description: 'Telemetry, state inspection, metrics, summaries, memory retrieval, contradiction detection.',
  },
  CLASS_B_REVERSIBLE_INTERNAL: {
    autoExecutable: true,
    requiresGovernance: true,
    requiresOwnerApproval: false,
    requiresToken: false,
    description: 'Reorganize internal task metadata, derived context refresh, priority recomputation, plan proposals, cache rebuilds.',
  },
  CLASS_C_OWNER_DECISION: {
    autoExecutable: false,
    requiresGovernance: true,
    requiresOwnerApproval: true,
    requiresToken: false,
    description: 'Changing strategic priorities, abandoning goals, selecting strategy alternatives, changing constraints.',
  },
  CLASS_D_EXTERNAL_HIGH_RISK: {
    autoExecutable: false,
    requiresGovernance: true,
    requiresOwnerApproval: true,
    requiresToken: true,
    description: 'External host interactions, destructive operations, system changes requiring HumanGate / WorldActionAuthorization.',
  },
});

// ---------------------------------------------------------------------------
// 2. Epistemic Status for Briefings & Inferences (Sections 7 & 8)
// ---------------------------------------------------------------------------

export type EpistemicStatus =
  | 'KNOWN'
  | 'LIKELY'
  | 'CONFIRMED'
  | 'OBSERVED'
  | 'INFERRED'
  | 'UNCERTAIN'
  | 'UNKNOWN'
  | 'CONTRADICTED'
  | 'REQUIRES_OWNER_CONFIRMATION';

export interface EpistemicItem<T = any> {
  readonly value: T;
  readonly status: EpistemicStatus;
  readonly category: EpistemicCategory;
  readonly confidence: number; // 0.0 to 1.0
  readonly evidence: string[];
  readonly source: string;
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// 3. Proactive Recommendation Contract (Section 6)
// ---------------------------------------------------------------------------

export interface ProactiveRecommendation {
  readonly recommendationId: string;
  readonly ownerId: string;
  readonly sessionId?: string;
  readonly actionClass: ProactiveActionClass;
  readonly sourceEvidence: string[];
  readonly reasoningSummary: string;
  readonly confidence: number; // 0.0 to 1.0
  readonly uncertainty: number; // 0.0 to 1.0 (1.0 - confidence)
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly alternatives: string[];
  readonly recommendedAction: string;
  readonly requiresOwnerDecision: boolean;
  readonly createdAt: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'OVERRIDDEN' | 'DISCARDED';
  resolvedAt?: number;
}

// ---------------------------------------------------------------------------
// 4. Owner Briefing Contract (Section 7)
// ---------------------------------------------------------------------------

export interface OwnerBriefing {
  readonly briefingId: string;
  readonly ownerId: string;
  readonly currentWorkingOn: EpistemicItem<string[]>;
  readonly mostImportant: EpistemicItem<string[]>;
  readonly blockedItems: EpistemicItem<string[]>;
  readonly recentChanges: EpistemicItem<string[]>;
  readonly recentFailures: EpistemicItem<string[]>;
  readonly decisionsRequired: EpistemicItem<string[]>;
  readonly activeRisks: EpistemicItem<string[]>;
  readonly nextConsiderations: EpistemicItem<string[]>;
  readonly missingInformation: EpistemicItem<string[]>;
  readonly progressingGoals: EpistemicItem<string[]>;
  readonly generatedAt: number;
  readonly overallConfidence: number;
}

// ---------------------------------------------------------------------------
// 5. Decision History Intelligence Contract (Section 9)
// ---------------------------------------------------------------------------

export interface DecisionHistoryRecord {
  readonly decisionId: string;
  readonly ownerId: string;
  readonly decision: string;
  readonly context: string;
  readonly alternatives: string[];
  readonly ownerDecision: string;
  readonly bowconRecommendation?: string;
  readonly reasoning: string;
  readonly evidence: string[];
  readonly expectedOutcome: string;
  actualOutcome?: string;
  verifiedOutcome?: boolean;
  lessons: string[];
  readonly timestamp: number;
  postMortemCompletedAt?: number;
}

// ---------------------------------------------------------------------------
// 6. Personal Pattern Contract (Section 10)
// ---------------------------------------------------------------------------

export type PersonalPatternType =
  | 'REPEATED_FAILURE'
  | 'REPEATED_SUCCESS'
  | 'REPEATED_BOTTLENECK'
  | 'REPEATED_DELAY'
  | 'REPEATED_TECHNICAL_PROBLEM'
  | 'REPEATED_DECISION_REVERSAL'
  | 'REPEATED_ASSUMPTION_FAILURE'
  | 'REPEATED_RESOURCE_CONSTRAINT';

export interface PersonalPattern {
  readonly patternId: string;
  readonly patternType: PersonalPatternType;
  readonly observedPattern: string;
  readonly evidenceCount: number;
  readonly evidenceRecords: string[];
  readonly confidence: number;
  readonly alternativeExplanations: string[];
  readonly unknowns: string[];
  readonly detectedAt: number;
}

// ---------------------------------------------------------------------------
// 7. Cognitive Challenge 2.0 Contract (Section 11)
// ---------------------------------------------------------------------------

export interface CognitiveChallenge2 {
  readonly challengeId: string;
  readonly target: string;
  readonly concerns: string[];
  readonly evidence: string[];
  readonly counterarguments: string[];
  readonly alternativePlans: string[];
  readonly confidence: number;
  readonly unknowns: string[];
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly isMandatorySafetyBlock: boolean;
  readonly evaluatedVectors: Record<string, { ok: boolean; notes?: string }>;
  ownerDecision?: 'WAITING FOR MASTER OWNER' | 'CONFIRMED' | 'OVERRIDDEN' | 'ABANDONED';
  readonly createdAt: number;
  resolvedAt?: number;
}

// ---------------------------------------------------------------------------
// 8. Long-Horizon Goal Intelligence (Section 12)
// ---------------------------------------------------------------------------

export interface GoalIntelligenceReport {
  readonly goalId: string;
  readonly title: string;
  readonly why: string;
  readonly successCriteria: string[];
  readonly constraints: string[];
  readonly priority: string;
  readonly deadlines?: string;
  readonly dependencies: string[];
  readonly currentState: string;
  readonly risks: string[];
  readonly blockers: string[];
  readonly healthScore: number; // 0.0 to 1.0
  readonly isStalled: boolean;
  readonly hasPriorityConflict: boolean;
  readonly recommendedAction?: string;
  readonly analyzedAt: number;
}

// ---------------------------------------------------------------------------
// 9. Personal Resource Awareness (Section 13)
// ---------------------------------------------------------------------------

export interface ResourceTelemetry {
  readonly cpuPercent: number | 'UNKNOWN';
  readonly totalRamBytes: number | 'UNKNOWN';
  readonly freeRamBytes: number | 'UNKNOWN';
  readonly processRssBytes: number | 'UNKNOWN';
  readonly activeCapabilities: string[];
  readonly activeLocks: string[];
  readonly runtimeHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// 10. Owner Conversation State (Section 15)
// ---------------------------------------------------------------------------

export interface OwnerConversationState {
  currentTopic?: string;
  activeProjectId?: string;
  activeGoalId?: string;
  activeTaskId?: string;
  currentDecision?: string;
  openQuestions: string[];
  unresolvedProblems: string[];
  ownerIntent?: string;
  lastInteractionTimestamp: number;
}

// ---------------------------------------------------------------------------
// 11. ID Generators
// ---------------------------------------------------------------------------

export function generatePersonalOsId(prefix: string): string {
  const ts = Date.now();
  const rand = randomBytes(4).toString('hex');
  return `${prefix}_${ts}_${rand}`;
}
