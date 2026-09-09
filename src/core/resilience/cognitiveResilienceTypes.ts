// src/core/resilience/cognitiveResilienceTypes.ts
// BOWCON V4.0 — MS-1.3.43: MASTER OWNER COGNITIVE RESILIENCE, ADAPTIVE HOST ORCHESTRATION
//               & SELF-REFLECTIVE EPISODIC SYNTHESIS RUNTIME
//
// Canonical type contracts for:
//   - Failure classification
//   - Bounded recovery lifecycle
//   - Episodic memory schema
//   - Self-reflection schema
//   - Confidence calibration schema
//   - Temporal reconciliation
//
// INVARIANTS:
// MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// OWNER_DECISION       > BOWCON_RECOMMENDATION
// USER_STOP            > EVERYTHING_AUTONOMOUS
// SELF_REFLECTION      != AUTHORITY
// SELF_CORRECTION      != AUTHORIZATION
// LEARNING             != EXECUTION
// RECOMMENDATION       != AUTHORIZATION
// PREDICTION           != FACT
// INFERENCE            != FACT
// MEMORY               != TRUTH
// C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Identity Generator
// ---------------------------------------------------------------------------
export function generateResilienceId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(3).toString('hex')}`;
}

// ---------------------------------------------------------------------------
// 1. Runtime Health State
// ---------------------------------------------------------------------------
export type ResilienceHealthState =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'RECOVERED'
  | 'BLOCKED'
  | 'UNKNOWN'
  | 'FAILED';

// ---------------------------------------------------------------------------
// 2. Failure Classification
// ---------------------------------------------------------------------------
export type FailureClass =
  | 'TRANSIENT'                  // Short-lived, likely self-resolving
  | 'STALE_STATE'                // Expired or outdated host/capability information
  | 'CAPABILITY_UNAVAILABLE'     // Required capability not present on host
  | 'EXECUTION_FAILURE'          // Action execution returned error
  | 'PARTIAL_EXECUTION'          // Execution started but did not complete
  | 'CYCLE_INTERRUPTED'          // Cognitive cycle was interrupted mid-flight
  | 'STATE_CORRUPTED'            // Persisted state failed integrity check
  | 'CONTRADICTED'               // Contradictory state detected
  | 'TELEMETRY_DEGRADED'         // Host telemetry unavailable or incomplete
  | 'VERIFICATION_INCOMPLETE'    // Execution output not independently verified
  | 'REPEATED_RECOVERY_FAILURE'; // Previous recovery attempts exceeded limit

// ---------------------------------------------------------------------------
// 3. Recovery Authorization Class (maps to supervisorRuntime RecoveryClass)
// ---------------------------------------------------------------------------
export type ResilienceRecoveryClass =
  | 'AUTO_SAFE'          // Fully autonomous, no sensitive state changes
  | 'AUTO_REVERSIBLE'    // Autonomous but reversible operation
  | 'HUMAN_REQUIRED'     // Must pass through HumanGate before execution
  | 'BLOCKED';           // Cannot recover without Owner intervention

// ---------------------------------------------------------------------------
// 4. Bounded Recovery Lifecycle
// ---------------------------------------------------------------------------
export interface ResilienceFailureRecord {
  readonly failureId: string;
  readonly timestamp: number;
  readonly failureClass: FailureClass;
  readonly description: string;
  readonly affectedComponent: string;
  readonly affectedCapability?: string;
  readonly evidence: string[];
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly isRecurring: boolean;
  readonly priorFailureIds: string[];
}

export interface ResilienceRecoveryProposal {
  readonly proposalId: string;
  readonly failureId: string;
  readonly timestamp: number;
  readonly recoveryClass: ResilienceRecoveryClass;
  readonly description: string;
  readonly steps: string[];
  readonly isReversible: boolean;
  readonly estimatedImpact: string;
  readonly maxAttempts: number;
  readonly requiresOwnerApproval: boolean;
  readonly target?: string;
}

export interface ResilienceRecoveryAttempt {
  readonly attemptId: string;
  readonly proposalId: string;
  readonly failureId: string;
  readonly attemptIndex: number;
  readonly startedAt: number;
  completedAt?: number;
  status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'ROLLED_BACK' | 'BLOCKED_BY_STOP';
  verificationPassed?: boolean;
  error?: string;
}

export interface ResilienceVerificationResult {
  readonly verificationId: string;
  readonly attemptId: string;
  readonly verifiedAt: number;
  readonly passed: boolean;
  readonly evidence: string;
  readonly method: 'DIRECT_OBSERVATION' | 'HOST_TELEMETRY' | 'OWNER_CONFIRMED';
}

// ---------------------------------------------------------------------------
// 5. Episodic Memory Schema
// ---------------------------------------------------------------------------
export type EpisodePhase =
  | 'OBSERVATION'
  | 'DECISION'
  | 'ACTION'
  | 'EXECUTION'
  | 'VERIFICATION'
  | 'OUTCOME'
  | 'LEARNING'
  | 'COMPLETED'
  | 'INTERRUPTED';

export interface EpisodeEvent {
  readonly eventId: string;
  readonly phase: EpisodePhase;
  readonly timestamp: number;
  readonly description: string;
  readonly provenance: string;
  readonly confidence: number;
}

export interface EpisodeLesson {
  readonly lessonId: string;
  readonly lesson: string;
  readonly confidence: number;
  readonly isSpeculative: boolean;         // True = not independently verified
  readonly derivedFrom: string[];          // evidenceIds or eventIds
  readonly appliesTo: string[];            // future context hints
}

export interface CognitiveEpisode {
  readonly episodeId: string;
  readonly createdAt: number;
  readonly ownerId: string;
  readonly projectId: string;
  readonly goalId: string;
  readonly triggeringContext: string;
  readonly relatedObjective: string;
  readonly events: EpisodeEvent[];
  readonly observations: string[];
  readonly decisions: string[];
  readonly ownerDecision?: string;
  readonly bowconRecommendation?: string;
  readonly authorizedActions: string[];
  readonly executionResult?: string;
  readonly verificationResult?: string;
  readonly outcome?: string;
  readonly lessons: EpisodeLesson[];
  readonly contradictions: string[];
  readonly uncertainties: string[];
  readonly provenanceChain: string[];
  readonly overallConfidence: number;
  readonly phase: EpisodePhase;
  readonly integrityHash: string;
  // Episodes are append-only. Historical events must not be overwritten.
  readonly isComplete: boolean;
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// 6. Self-Reflection Schema
// ---------------------------------------------------------------------------
export type ReflectionVerdict =
  | 'REASONING_SOUND'         // Reasoning was evidence-backed and appropriate
  | 'REASONING_ASSUMPTION_BASED'  // Reasoning relied on unverified assumptions
  | 'REASONING_INCOMPLETE'    // Key information was missing
  | 'RECOMMENDATION_CORRECT'  // Recommendation matched verified outcome
  | 'RECOMMENDATION_PARTIAL'  // Recommendation was partially correct
  | 'RECOMMENDATION_INCORRECT' // Recommendation did not match verified outcome
  | 'PREDICTION_VERIFIED'     // Prediction was independently verified
  | 'PREDICTION_REFUTED'      // Prediction was shown incorrect
  | 'PREDICTION_UNVERIFIED'   // Prediction has not yet been verified
  | 'UNKNOWN';

export interface ReflectionRecord {
  readonly reflectionId: string;
  readonly reflectedAt: number;
  readonly subjectEpisodeId: string;
  readonly subjectDecisionId?: string;
  readonly reasoningQuality: ReflectionVerdict;
  readonly decisionQuality: ReflectionVerdict;
  readonly predictionQuality: ReflectionVerdict;
  readonly wasEvidenceBacked: boolean;
  readonly relianceOnAssumptions: number;   // 0.0–1.0 fraction
  readonly missingInformation: string[];
  readonly bowconRecommendation?: string;
  readonly ownerDecision?: string;
  readonly recommendationMatchedReality: boolean | null; // null = not yet verifiable
  readonly insights: string[];
  readonly lessons: string[];
  readonly patterns: string[];
  readonly openQuestions: string[];
  // INVARIANT: reflection cannot become authority
  readonly isBoundedToRecommendation: true;
}

// ---------------------------------------------------------------------------
// 7. Confidence Calibration Schema
// ---------------------------------------------------------------------------
export type CalibrationSignal =
  | 'OVERCONFIDENT'     // Predicted confidence > verified outcome success rate
  | 'UNDERCONFIDENT'    // Predicted confidence < verified outcome success rate
  | 'CALIBRATED'        // Predicted confidence ≈ verified outcome success rate
  | 'INSUFFICIENT_DATA'; // Not enough verified outcomes to make determination

export interface ConfidenceCalibrationRecord {
  readonly calibrationId: string;
  readonly calibratedAt: number;
  readonly subjectId: string;                // Episode or decision ID
  readonly predictedConfidence: number;      // 0.0–1.0
  readonly verifiedOutcomeSuccessRate: number; // 0.0–1.0 based on actual outcomes
  readonly signal: CalibrationSignal;
  readonly sampleSize: number;               // Number of outcomes considered
  readonly confidenceAdjustmentSignal: number; // delta suggestion (NOT direct override)
  // INVARIANT: calibration does not rewrite historical confidence values
  readonly historicalRecordsUnmodified: true;
  readonly notes: string;
}

// ---------------------------------------------------------------------------
// 8. Temporal Reconciliation Record
// ---------------------------------------------------------------------------
export type TemporalStatus =
  | 'CURRENT'       // Freshly observed within staleness threshold
  | 'RECENT'        // Within acceptable age range
  | 'STALE'         // Older than staleness threshold, re-discovery recommended
  | 'EXPIRED'       // Past expiry time, must not be trusted
  | 'CONTRADICTED'  // Conflicts with another observation
  | 'UNKNOWN';      // Age unknown or discovery failed

export interface TemporalReconciliationRecord {
  readonly reconciliationId: string;
  readonly reconciledAt: number;
  readonly subjectKey: string;
  readonly originalObservedAt: number;
  readonly stalenessStatus: TemporalStatus;
  readonly rediscoveryRequired: boolean;
  readonly conflictingSourceA?: string;
  readonly conflictingSourceB?: string;
  readonly resolution: 'UPDATED_BY_TELEMETRY' | 'OWNER_CONFIRMED' | 'UNRESOLVED' | 'UNKNOWN';
  readonly historicalObservationPreserved: true;
}

// ---------------------------------------------------------------------------
// 9. Host Adaptation Record
// ---------------------------------------------------------------------------
export interface HostAdaptationEvent {
  readonly adaptationId: string;
  readonly detectedAt: number;
  readonly changedAspect: string;
  readonly previousValue: string;
  readonly newValue: string;
  readonly impactedPlans: string[];
  readonly planReEvaluationRequired: boolean;
  readonly newFeasibilityStatus?: string;
}

// ===========================================================================
// MS-1.3.44: DURABLE RESILIENCE, CROSS-EPISODE LEARNING & GOAL CONTINUITY
// ===========================================================================

// ---------------------------------------------------------------------------
// 10. Durable Resilience State Persistence Contract
// ---------------------------------------------------------------------------
export interface DurableResilienceStateRecord {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly ownerId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly healthState: ResilienceHealthState;
  readonly failures: ResilienceFailureRecord[];
  readonly activeProposals: ResilienceRecoveryProposal[];
  readonly attempts: Record<string, ResilienceRecoveryAttempt[]>;
  readonly verifications: Record<string, ResilienceVerificationResult>;
  readonly resolvedFailureIds: string[];
  readonly recoveryCounters: {
    totalFailures: number;
    totalRecoveries: number;
    failedRecoveries: number;
  };
  readonly unresolvedRecoveryConditions: string[];
  readonly isStopped: boolean;
  readonly stopReason: string;
  readonly stateStatus: 'VALID' | 'CORRUPTED' | 'REBUILT';
  readonly integrityHash: string;
  // INVARIANT: Authority tokens, secrets, credentials, temporary authorizations MUST NOT be persisted
  readonly containsAuthorityTokens: false;
  readonly containsCredentials: false;
}

// ---------------------------------------------------------------------------
// 11. Cross-Episode Pattern Mining Schema
// ---------------------------------------------------------------------------
export type CrossEpisodePatternType =
  | 'REPEATED_FAILURE'
  | 'REPEATED_RECOVERY_FAILURE'
  | 'CAPABILITY_UNAVAILABLE_RECURRING'
  | 'HOST_INSTABILITY_RECURRING'
  | 'PLAN_INFEASIBILITY_RECURRING'
  | 'CYCLE_INTERRUPTED_RECURRING'
  | 'VERIFICATION_FAILURE_RECURRING'
  | 'CONTRADICTION_RECURRING'
  | 'DECISION_REVERSAL_RECURRING'
  | 'BOTTLENECK_RECURRING'
  | 'LONG_HORIZON_GOAL_STALL';

export type PatternProvenance =
  | 'OBSERVED_PATTERN'
  | 'INFERENCE'
  | 'HYPOTHESIS'
  | 'OWNER_CONFIRMED_PATTERN';

export type PatternStatus =
  | 'ACTIVE'
  | 'RESOLVED'
  | 'REFUTED'
  | 'MONITORING';

export interface CrossEpisodePattern {
  readonly patternId: string;
  readonly patternType: CrossEpisodePatternType;
  readonly description: string;
  readonly observationCount: number; // MUST be >= 2 (never from single observation)
  readonly supportingEpisodeIds: string[];
  readonly firstObservedAt: number;
  readonly lastObservedAt: number;
  readonly confidence: number; // 0.0 - 1.0
  readonly provenance: PatternProvenance;
  readonly patternStatus: PatternStatus;
  readonly contradictoryEvidence: string[];
  readonly unresolvedUncertainty: string[];
  readonly recommendedAction?: string;
  // INVARIANT: Patterns are advisory only -- never authorization
  readonly isAdvisoryOnly: true;
}

// ---------------------------------------------------------------------------
// 12. Recovery Lesson Federation Schema (World Model Bridge)
// ---------------------------------------------------------------------------
export type RecoveryLessonFederationRecordType =
  | 'LEARNED_RECOVERY_LESSON'
  | 'RECURRING_FAILURE_SIGNAL'
  | 'CAPABILITY_RISK'
  | 'PLANNING_CAUTION'
  | 'CONFIDENCE_ADJUSTMENT'
  | 'UNRESOLVED_INFORMATION_GAP'
  | 'GOAL_CONTINUITY_WARNING'
  | 'VERIFICATION_RECOMMENDATION';

export interface RecoveryLessonFederationRecord {
  readonly recordId: string;
  readonly recordType: RecoveryLessonFederationRecordType;
  readonly title: string;
  readonly description: string;
  readonly sourceEpisodeIds: string[];
  readonly sourceEvidence: string[];
  readonly provenance: PatternProvenance;
  readonly confidence: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'REFUTED';
  readonly expiresAt?: number;
  readonly isStale: boolean;
  readonly contradictions: string[];
  // INVARIANT: Advisory layer cannot overwrite direct host facts
  readonly isAdvisoryOnly: true;
}

// ---------------------------------------------------------------------------
// 13. Long-Horizon Goal Continuity Schema
// ---------------------------------------------------------------------------
export type LongHorizonGoalState =
  | 'ACTIVE'
  | 'PROGRESSING'
  | 'STALLED'
  | 'BLOCKED'
  | 'INTERRUPTED'
  | 'AT_RISK'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'UNKNOWN';

export type OwnerIntentSemantic =
  | 'NONE'
  | 'ABANDONED'
  | 'REPRIORITIZED'
  | 'COMPLETED_BY_EXTERNAL_ACTION';

export interface LongHorizonGoalRecord {
  readonly goalId: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly title: string;
  readonly objective: string;
  readonly state: LongHorizonGoalState;
  readonly progressPercent: number; // 0 - 100
  readonly createdAt: number;
  readonly lastProgressAt: number;
  readonly stalledDurationMs: number;
  readonly blockedDurationMs: number;
  readonly interruptionHistory: {
    interruptedAt: number;
    resumedAt?: number;
    reason: string;
  }[];
  readonly recoveryHistory: {
    attemptId: string;
    recoveredAt: number;
    success: boolean;
  }[];
  readonly relatedEpisodeIds: string[];
  readonly relatedDecisions: string[];
  readonly relatedContradictions: string[];
  readonly currentFeasibility: 'FEASIBLE' | 'FEASIBLE_WITH_CAUTION' | 'PLAN_BLOCKED' | 'UNKNOWN';
  readonly capabilityDependencies: string[];
  readonly latestVerifiedOutcome?: string;
  readonly nextInformationGap?: string;
  readonly ownerIntentOverride?: {
    semantic: OwnerIntentSemantic;
    affirmedBy: string;
    timestamp: number;
    rationale: string;
  };
  // INVARIANT: Inactivity != Abandoned; BOWCON recommends, Owner decides
  readonly isOwnerIntentAffirmed: boolean;
}

