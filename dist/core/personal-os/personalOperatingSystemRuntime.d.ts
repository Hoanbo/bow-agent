import { OwnerBriefing, GoalIntelligenceReport, ResourceTelemetry } from './personalOsTypes';
import { CognitivePartnershipRuntime } from '../partnership/cognitivePartnershipRuntime';
import { ProactiveRecommendationEngine } from './proactiveRecommendationEngine';
import { OwnerBriefingEngine } from './ownerBriefingEngine';
import { DecisionHistoryEngine, RecordDecisionParams } from './decisionHistoryEngine';
import { PersonalPatternEngine } from './personalPatternEngine';
import { CognitiveChallenge2Engine } from './cognitiveChallenge2';
import { GoalIntelligenceEngine, GoalEvaluationInput } from './goalIntelligenceEngine';
import { PersonalResourceMonitor } from './personalResourceMonitor';
import { OwnerConversationStateManager } from './ownerConversationState';
export interface PersonalOperatingSystemOptions {
    partnershipRuntime?: CognitivePartnershipRuntime;
}
export interface CognitiveLoopIterationResult {
    iterationId: string;
    stageReached: string;
    observedTelemetry: ResourceTelemetry;
    reconstructedObjective?: string;
    recalledMemoryCount: number;
    recommendationsGenerated: number;
    challengesRaised: number;
    governedActionExecuted?: boolean;
    learningRecorded?: boolean;
    status: 'COMPLETED' | 'STOPPED' | 'AWAITING_OWNER_DECISION';
    timestamp: number;
}
export declare class PersonalOperatingSystemRuntime {
    readonly partnership: CognitivePartnershipRuntime;
    readonly recommendationEngine: ProactiveRecommendationEngine;
    readonly briefingEngine: OwnerBriefingEngine;
    readonly decisionHistory: DecisionHistoryEngine;
    readonly patternEngine: PersonalPatternEngine;
    readonly challengeEngine2: CognitiveChallenge2Engine;
    readonly goalIntelligence: GoalIntelligenceEngine;
    readonly resourceMonitor: PersonalResourceMonitor;
    readonly conversationState: OwnerConversationStateManager;
    private isEmergencyHalted;
    private isPaused;
    constructor(options?: PersonalOperatingSystemOptions);
    /**
     * Execute one complete 16-stage proactive personal cognitive loop iteration.
     */
    executeCognitiveLoop(ownerId?: string): Promise<CognitiveLoopIterationResult>;
    /**
     * Request an executive Owner Briefing.
     */
    getOwnerBriefing(ownerId?: string): OwnerBriefing;
    /**
     * Evaluate a long-term goal with Goal Intelligence.
     */
    evaluateGoalIntelligence(ownerId: string, input: GoalEvaluationInput): GoalIntelligenceReport;
    /**
     * Record a decision in history.
     */
    recordDecision(ownerId: string, params: RecordDecisionParams): import("./personalOsTypes").DecisionHistoryRecord;
    /**
     * Emergency stop (USER_STOP).
     */
    emergencyStop(ownerId?: string): void;
    /**
     * Reset emergency stop.
     */
    reset(ownerId?: string): void;
    /**
     * Check if halted.
     */
    isHalted(): boolean;
    /**
     * Pause / resume.
     */
    setPaused(paused: boolean, ownerId?: string): void;
    getIsPaused(): boolean;
}
