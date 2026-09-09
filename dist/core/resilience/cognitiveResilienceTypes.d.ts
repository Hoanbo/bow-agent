export declare function generateResilienceId(prefix: string): string;
export type ResilienceHealthState = 'HEALTHY' | 'DEGRADED' | 'RECOVERING' | 'RECOVERED' | 'BLOCKED' | 'UNKNOWN' | 'FAILED';
export type FailureClass = 'TRANSIENT' | 'STALE_STATE' | 'CAPABILITY_UNAVAILABLE' | 'EXECUTION_FAILURE' | 'PARTIAL_EXECUTION' | 'CYCLE_INTERRUPTED' | 'STATE_CORRUPTED' | 'CONTRADICTED' | 'TELEMETRY_DEGRADED' | 'VERIFICATION_INCOMPLETE' | 'REPEATED_RECOVERY_FAILURE';
export type ResilienceRecoveryClass = 'AUTO_SAFE' | 'AUTO_REVERSIBLE' | 'HUMAN_REQUIRED' | 'BLOCKED';
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
export type EpisodePhase = 'OBSERVATION' | 'DECISION' | 'ACTION' | 'EXECUTION' | 'VERIFICATION' | 'OUTCOME' | 'LEARNING' | 'COMPLETED' | 'INTERRUPTED';
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
    readonly isSpeculative: boolean;
    readonly derivedFrom: string[];
    readonly appliesTo: string[];
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
    readonly isComplete: boolean;
    completedAt?: number;
}
export type ReflectionVerdict = 'REASONING_SOUND' | 'REASONING_ASSUMPTION_BASED' | 'REASONING_INCOMPLETE' | 'RECOMMENDATION_CORRECT' | 'RECOMMENDATION_PARTIAL' | 'RECOMMENDATION_INCORRECT' | 'PREDICTION_VERIFIED' | 'PREDICTION_REFUTED' | 'PREDICTION_UNVERIFIED' | 'UNKNOWN';
export interface ReflectionRecord {
    readonly reflectionId: string;
    readonly reflectedAt: number;
    readonly subjectEpisodeId: string;
    readonly subjectDecisionId?: string;
    readonly reasoningQuality: ReflectionVerdict;
    readonly decisionQuality: ReflectionVerdict;
    readonly predictionQuality: ReflectionVerdict;
    readonly wasEvidenceBacked: boolean;
    readonly relianceOnAssumptions: number;
    readonly missingInformation: string[];
    readonly bowconRecommendation?: string;
    readonly ownerDecision?: string;
    readonly recommendationMatchedReality: boolean | null;
    readonly insights: string[];
    readonly lessons: string[];
    readonly patterns: string[];
    readonly openQuestions: string[];
    readonly isBoundedToRecommendation: true;
}
export type CalibrationSignal = 'OVERCONFIDENT' | 'UNDERCONFIDENT' | 'CALIBRATED' | 'INSUFFICIENT_DATA';
export interface ConfidenceCalibrationRecord {
    readonly calibrationId: string;
    readonly calibratedAt: number;
    readonly subjectId: string;
    readonly predictedConfidence: number;
    readonly verifiedOutcomeSuccessRate: number;
    readonly signal: CalibrationSignal;
    readonly sampleSize: number;
    readonly confidenceAdjustmentSignal: number;
    readonly historicalRecordsUnmodified: true;
    readonly notes: string;
}
export type TemporalStatus = 'CURRENT' | 'RECENT' | 'STALE' | 'EXPIRED' | 'CONTRADICTED' | 'UNKNOWN';
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
    readonly containsAuthorityTokens: false;
    readonly containsCredentials: false;
}
export type CrossEpisodePatternType = 'REPEATED_FAILURE' | 'REPEATED_RECOVERY_FAILURE' | 'CAPABILITY_UNAVAILABLE_RECURRING' | 'HOST_INSTABILITY_RECURRING' | 'PLAN_INFEASIBILITY_RECURRING' | 'CYCLE_INTERRUPTED_RECURRING' | 'VERIFICATION_FAILURE_RECURRING' | 'CONTRADICTION_RECURRING' | 'DECISION_REVERSAL_RECURRING' | 'BOTTLENECK_RECURRING' | 'LONG_HORIZON_GOAL_STALL';
export type PatternProvenance = 'OBSERVED_PATTERN' | 'INFERENCE' | 'HYPOTHESIS' | 'OWNER_CONFIRMED_PATTERN';
export type PatternStatus = 'ACTIVE' | 'RESOLVED' | 'REFUTED' | 'MONITORING';
export interface CrossEpisodePattern {
    readonly patternId: string;
    readonly patternType: CrossEpisodePatternType;
    readonly description: string;
    readonly observationCount: number;
    readonly supportingEpisodeIds: string[];
    readonly firstObservedAt: number;
    readonly lastObservedAt: number;
    readonly confidence: number;
    readonly provenance: PatternProvenance;
    readonly patternStatus: PatternStatus;
    readonly contradictoryEvidence: string[];
    readonly unresolvedUncertainty: string[];
    readonly recommendedAction?: string;
    readonly isAdvisoryOnly: true;
}
export type RecoveryLessonFederationRecordType = 'LEARNED_RECOVERY_LESSON' | 'RECURRING_FAILURE_SIGNAL' | 'CAPABILITY_RISK' | 'PLANNING_CAUTION' | 'CONFIDENCE_ADJUSTMENT' | 'UNRESOLVED_INFORMATION_GAP' | 'GOAL_CONTINUITY_WARNING' | 'VERIFICATION_RECOMMENDATION';
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
    readonly isAdvisoryOnly: true;
}
export type LongHorizonGoalState = 'ACTIVE' | 'PROGRESSING' | 'STALLED' | 'BLOCKED' | 'INTERRUPTED' | 'AT_RISK' | 'COMPLETED' | 'ABANDONED' | 'UNKNOWN';
export type OwnerIntentSemantic = 'NONE' | 'ABANDONED' | 'REPRIORITIZED' | 'COMPLETED_BY_EXTERNAL_ACTION';
export interface LongHorizonGoalRecord {
    readonly goalId: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly title: string;
    readonly objective: string;
    readonly state: LongHorizonGoalState;
    readonly progressPercent: number;
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
    readonly isOwnerIntentAffirmed: boolean;
}
