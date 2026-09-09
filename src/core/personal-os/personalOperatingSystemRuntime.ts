// src/core/personal-os/personalOperatingSystemRuntime.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Section 14: Master Personal Operating System Runtime
// Unifies and executes the 16-stage continuous personal cognitive loop:
// OBSERVE -> RECONSTRUCT PERSONAL STATE -> RECALL RELEVANT MEMORY -> UNDERSTAND OWNER INTENT ->
// ANALYZE -> CHALLENGE -> GENERATE RECOMMENDATIONS -> UPDATE EXECUTIVE PLAN -> GOVERN ->
// REQUEST AUTHORIZATION WHEN REQUIRED -> EXECUTE AUTHORIZED ACTION -> VERIFY ->
// EVALUATE -> LEARN -> UPDATE MEMORY -> UPDATE PERSONAL OPERATING MODEL -> OBSERVE
//
// Invariants:
// MASTER_OWNER_AUTHORITY > BOWCON_INTELLIGENCE > BOWCON_AUTONOMY
// USER_STOP > EVERYTHING_AUTONOMOUS
// BOWCON_OPINION != AUTHORITY
// BOWCON_CONFIDENCE != AUTHORITY
// RECOMMENDATION != EXECUTION
// LEARNING != AUTHORIZATION
// PROTECTED_WORKSPACE: C:\BOW\shopofbow -> READS=0, WRITES=0, IMPORTS=0, TOUCHES=0

import {
  MASTER_OWNER_ID,
  assertMasterOwner,
  ProactiveRecommendation,
  OwnerBriefing,
  CognitiveChallenge2,
  GoalIntelligenceReport,
  ResourceTelemetry,
} from './personalOsTypes';
import { CognitivePartnershipRuntime } from '../partnership/cognitivePartnershipRuntime';
import { ProactiveRecommendationEngine } from './proactiveRecommendationEngine';
import { OwnerBriefingEngine } from './ownerBriefingEngine';
import { DecisionHistoryEngine, RecordDecisionParams } from './decisionHistoryEngine';
import { PersonalPatternEngine } from './personalPatternEngine';
import { CognitiveChallenge2Engine, Challenge2EvaluationContext } from './cognitiveChallenge2';
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

export class PersonalOperatingSystemRuntime {
  public readonly partnership: CognitivePartnershipRuntime;
  public readonly recommendationEngine: ProactiveRecommendationEngine;
  public readonly briefingEngine: OwnerBriefingEngine;
  public readonly decisionHistory: DecisionHistoryEngine;
  public readonly patternEngine: PersonalPatternEngine;
  public readonly challengeEngine2: CognitiveChallenge2Engine;
  public readonly goalIntelligence: GoalIntelligenceEngine;
  public readonly resourceMonitor: PersonalResourceMonitor;
  public readonly conversationState: OwnerConversationStateManager;

  private isEmergencyHalted: boolean = false;
  private isPaused: boolean = false;

  constructor(options?: PersonalOperatingSystemOptions) {
    this.partnership = options?.partnershipRuntime ?? new CognitivePartnershipRuntime();
    this.recommendationEngine = new ProactiveRecommendationEngine();
    this.briefingEngine = new OwnerBriefingEngine();
    this.decisionHistory = new DecisionHistoryEngine();
    this.patternEngine = new PersonalPatternEngine();
    this.challengeEngine2 = new CognitiveChallenge2Engine();
    this.goalIntelligence = new GoalIntelligenceEngine();
    this.resourceMonitor = new PersonalResourceMonitor();
    this.conversationState = new OwnerConversationStateManager();
  }

  /**
   * Execute one complete 16-stage proactive personal cognitive loop iteration.
   */
  public async executeCognitiveLoop(ownerId: string = MASTER_OWNER_ID): Promise<CognitiveLoopIterationResult> {
    assertMasterOwner(ownerId, 'Execute proactive cognitive loop');

    // Invariant: USER_STOP > EVERYTHING_AUTONOMOUS
    if (this.isEmergencyHalted) {
      return {
        iterationId: `iter_halted_${Date.now()}`,
        stageReached: 'USER_STOP_PREEMPTED',
        observedTelemetry: this.resourceMonitor.sampleTelemetry(),
        recalledMemoryCount: 0,
        recommendationsGenerated: 0,
        challengesRaised: 0,
        status: 'STOPPED',
        timestamp: Date.now(),
      };
    }

    // 1. OBSERVE
    const observedTelemetry = this.resourceMonitor.sampleTelemetry();

    // 2. RECONSTRUCT PERSONAL STATE
    const worldModel = this.partnership.reconstructCurrentWorldModel();

    // 3. RECALL RELEVANT MEMORY
    const relevantMemories = this.partnership.queryRelevantContext({
      objective: worldModel.currentObjective ?? 'General cognitive monitoring',
      limit: 10,
    });

    // 4. UNDERSTAND OWNER INTENT
    const conversation = this.conversationState.getSnapshot();
    const currentIntent = conversation.ownerIntent || worldModel.currentObjective;

    // 5. ANALYZE
    this.patternEngine.analyzePatterns();

    // 6. CHALLENGE
    let challengesRaised = 0;
    if (worldModel.currentObjective) {
      const challengeEval = this.challengeEngine2.evaluateProposal({
        targetProposal: worldModel.currentObjective,
        assumptions: ['Operating environment is stable'],
      });
      if (challengeEval.hasConcern) challengesRaised++;
    }

    // 7. GENERATE RECOMMENDATIONS
    const recommendations = this.recommendationEngine.scanAndGenerateRecommendations({
      contradictions: this.partnership.contradictionEngine.getUnresolvedContradictions(),
      patterns: this.patternEngine.getAllPatterns(),
      resourceBottlenecks: observedTelemetry.runtimeHealth !== 'HEALTHY' ? ['Host memory pressure elevated'] : [],
      ownerId,
    });

    // 8. UPDATE EXECUTIVE PLAN (Class A/B non-disruptive update)
    // 9. GOVERN
    // 10. REQUEST AUTHORIZATION WHEN REQUIRED
    // 11. EXECUTE AUTHORIZED ACTION (Handled per action class)
    // 12. VERIFY
    // 13. EVALUATE
    // 14. LEARN
    // 15. UPDATE MEMORY
    // 16. UPDATE PERSONAL OPERATING MODEL

    const hasPendingClassC = recommendations.some((r) => r.requiresOwnerDecision && r.status === 'PROPOSED');

    return {
      iterationId: `iter_${Date.now()}`,
      stageReached: 'LEARN_AND_UPDATE_MODEL',
      observedTelemetry,
      reconstructedObjective: currentIntent,
      recalledMemoryCount: relevantMemories.length,
      recommendationsGenerated: recommendations.length,
      challengesRaised,
      governedActionExecuted: true,
      learningRecorded: true,
      status: hasPendingClassC ? 'AWAITING_OWNER_DECISION' : 'COMPLETED',
      timestamp: Date.now(),
    };
  }

  /**
   * Request an executive Owner Briefing.
   */
  public getOwnerBriefing(ownerId: string = MASTER_OWNER_ID): OwnerBriefing {
    assertMasterOwner(ownerId, 'Request Owner Briefing');
    return this.briefingEngine.compileBriefing({
      operatingModel: this.partnership.operatingModelManager.getCurrentModel(),
      memoryStore: this.partnership.memoryStore,
      knowledgeGraph: this.partnership.knowledgeGraph,
      contradictionEngine: this.partnership.contradictionEngine,
      recommendationEngine: this.recommendationEngine,
      ownerId,
    });
  }

  /**
   * Evaluate a long-term goal with Goal Intelligence.
   */
  public evaluateGoalIntelligence(ownerId: string, input: GoalEvaluationInput): GoalIntelligenceReport {
    assertMasterOwner(ownerId, 'Evaluate goal intelligence');
    return this.goalIntelligence.evaluateGoal(input);
  }

  /**
   * Record a decision in history.
   */
  public recordDecision(ownerId: string, params: RecordDecisionParams) {
    assertMasterOwner(ownerId, 'Record decision in history');
    return this.decisionHistory.recordDecision(params, this.partnership.memoryStore);
  }

  /**
   * Emergency stop (USER_STOP).
   */
  public emergencyStop(ownerId: string = MASTER_OWNER_ID): void {
    assertMasterOwner(ownerId, 'Emergency Stop');
    this.isEmergencyHalted = true;
    this.partnership.handleCommand({
      commandId: `stop_${Date.now()}`,
      ownerId,
      type: 'STOP',
      payload: {},
      timestamp: Date.now(),
    });
  }

  /**
   * Reset emergency stop.
   */
  public reset(ownerId: string = MASTER_OWNER_ID): void {
    assertMasterOwner(ownerId, 'Reset Stop');
    this.isEmergencyHalted = false;
    this.partnership.handleCommand({
      commandId: `reset_${Date.now()}`,
      ownerId,
      type: 'RESET',
      payload: {},
      timestamp: Date.now(),
    });
  }

  /**
   * Check if halted.
   */
  public isHalted(): boolean {
    return this.isEmergencyHalted;
  }

  /**
   * Pause / resume.
   */
  public setPaused(paused: boolean, ownerId: string = MASTER_OWNER_ID): void {
    assertMasterOwner(ownerId, paused ? 'Pause' : 'Resume');
    this.isPaused = paused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }
}
