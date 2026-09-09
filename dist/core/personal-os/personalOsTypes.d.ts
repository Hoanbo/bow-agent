import { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, assertMasterOwner, EpistemicCategory } from '../partnership/partnershipTypes';
export { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, assertMasterOwner, };
export type ProactiveActionClass = 'CLASS_A_INFORMATIONAL' | 'CLASS_B_REVERSIBLE_INTERNAL' | 'CLASS_C_OWNER_DECISION' | 'CLASS_D_EXTERNAL_HIGH_RISK';
export declare const PROACTIVE_ACTION_CLASSES: readonly ["CLASS_A_INFORMATIONAL", "CLASS_B_REVERSIBLE_INTERNAL", "CLASS_C_OWNER_DECISION", "CLASS_D_EXTERNAL_HIGH_RISK"];
export interface ActionClassPolicy {
    readonly autoExecutable: boolean;
    readonly requiresGovernance: boolean;
    readonly requiresOwnerApproval: boolean;
    readonly requiresToken: boolean;
    readonly description: string;
}
export declare const ACTION_CLASS_POLICIES: Record<ProactiveActionClass, ActionClassPolicy>;
export type EpistemicStatus = 'KNOWN' | 'LIKELY' | 'CONFIRMED' | 'OBSERVED' | 'INFERRED' | 'UNCERTAIN' | 'UNKNOWN' | 'CONTRADICTED' | 'REQUIRES_OWNER_CONFIRMATION';
export interface EpistemicItem<T = any> {
    readonly value: T;
    readonly status: EpistemicStatus;
    readonly category: EpistemicCategory;
    readonly confidence: number;
    readonly evidence: string[];
    readonly source: string;
    readonly timestamp: number;
}
export interface ProactiveRecommendation {
    readonly recommendationId: string;
    readonly ownerId: string;
    readonly sessionId?: string;
    readonly actionClass: ProactiveActionClass;
    readonly sourceEvidence: string[];
    readonly reasoningSummary: string;
    readonly confidence: number;
    readonly uncertainty: number;
    readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly alternatives: string[];
    readonly recommendedAction: string;
    readonly requiresOwnerDecision: boolean;
    readonly createdAt: number;
    status: 'PROPOSED' | 'ACCEPTED' | 'OVERRIDDEN' | 'DISCARDED';
    resolvedAt?: number;
}
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
export type PersonalPatternType = 'REPEATED_FAILURE' | 'REPEATED_SUCCESS' | 'REPEATED_BOTTLENECK' | 'REPEATED_DELAY' | 'REPEATED_TECHNICAL_PROBLEM' | 'REPEATED_DECISION_REVERSAL' | 'REPEATED_ASSUMPTION_FAILURE' | 'REPEATED_RESOURCE_CONSTRAINT';
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
    readonly evaluatedVectors: Record<string, {
        ok: boolean;
        notes?: string;
    }>;
    ownerDecision?: 'WAITING FOR MASTER OWNER' | 'CONFIRMED' | 'OVERRIDDEN' | 'ABANDONED';
    readonly createdAt: number;
    resolvedAt?: number;
}
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
    readonly healthScore: number;
    readonly isStalled: boolean;
    readonly hasPriorityConflict: boolean;
    readonly recommendedAction?: string;
    readonly analyzedAt: number;
}
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
export declare function generatePersonalOsId(prefix: string): string;
