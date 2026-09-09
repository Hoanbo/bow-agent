// src/core/partnership/cognitivePartnershipRuntime.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Section 14: Cognitive Partnership Runtime
// Master orchestrator unifying:
// - PersonalMemoryStore
// - PersonalKnowledgeGraph
// - ContextRelevanceEngine
// - ContradictionEngine
// - CognitiveChallengeEngine
// - SelfCorrectionEngine
// - OutcomeLearningEngine
// - PersonalDecisionSupport
// - PersonalOperatingModelManager
//
// Subordinated to:
// - Master Human Authority (Master Owner)
// - HumanGate / WorldActionAuthorization
// - ExecutiveRuntime / ContinuousAgentLoop / SupervisorRuntime
//
// Invariants:
// MASTER_OWNER_AUTHORITY > BOWCON_REASONING > BOWCON_AUTONOMY
// BOWCON_OPINION != AUTHORITY
// BOWCON_CONFIDENCE != AUTHORITY
// INFERENCE != CONFIRMED MEMORY
// CHALLENGE != AUTHORITY
// RECOMMENDATION != EXECUTION
// LEARNING != AUTHORIZATION
// USER_STOP > EVERYTHING
// PROTECTED_WORKSPACE: C:\BOW\shopofbow -> READS=0, WRITES=0, IMPORTS=0, TOUCHES=0

import {
  PersonalMemoryStore,
} from './personalMemoryStore';
import {
  PersonalKnowledgeGraph,
} from './personalKnowledgeGraph';
import {
  ContextRelevanceEngine,
  ContextQuery,
  ScoredMemoryItem,
} from './contextRelevanceEngine';
import {
  ContradictionEngine,
} from './contradictionEngine';
import {
  CognitiveChallengeEngine,
} from './cognitiveChallengeEngine';
import {
  SelfCorrectionEngine,
  CreateSelfCorrectionParams,
} from './selfCorrectionEngine';
import {
  OutcomeLearningEngine,
  OutcomeEvaluationParams,
} from './outcomeLearningEngine';
import {
  PersonalDecisionSupport,
  DecisionResponse,
} from './personalDecisionSupport';
import {
  PersonalOperatingModelManager,
} from './personalOperatingModel';
import {
  MASTER_OWNER_ID,
  assertMasterOwner,
  MasterOwnerCommand,
  CognitiveChallenge,
  ContradictionType,
  ContradictionRecord,
  SelfCorrectionRecord,
  OutcomeLearningRecord,
  PersonalOperatingModel,
  PersonalMemoryItem,
} from './partnershipTypes';

export interface CognitivePartnershipRuntimeOptions {
  memoryStoragePath?: string;
  graphStoragePath?: string;
  modelStoragePath?: string;
}

export class CognitivePartnershipRuntime {
  public readonly memoryStore: PersonalMemoryStore;
  public readonly knowledgeGraph: PersonalKnowledgeGraph;
  public readonly relevanceEngine: ContextRelevanceEngine;
  public readonly contradictionEngine: ContradictionEngine;
  public readonly challengeEngine: CognitiveChallengeEngine;
  public readonly selfCorrectionEngine: SelfCorrectionEngine;
  public readonly outcomeLearningEngine: OutcomeLearningEngine;
  public readonly decisionSupport: PersonalDecisionSupport;
  public readonly operatingModelManager: PersonalOperatingModelManager;

  private isEmergencyStopped: boolean = false;

  constructor(options?: CognitivePartnershipRuntimeOptions) {
    this.memoryStore = new PersonalMemoryStore(options?.memoryStoragePath);
    this.knowledgeGraph = new PersonalKnowledgeGraph(options?.graphStoragePath);
    this.relevanceEngine = new ContextRelevanceEngine();
    this.contradictionEngine = new ContradictionEngine();
    this.challengeEngine = new CognitiveChallengeEngine();
    this.selfCorrectionEngine = new SelfCorrectionEngine();
    this.outcomeLearningEngine = new OutcomeLearningEngine();
    this.decisionSupport = new PersonalDecisionSupport(this.challengeEngine);
    this.operatingModelManager = new PersonalOperatingModelManager(options?.modelStoragePath);

    // Initialize root nodes in knowledge graph if empty
    if (this.knowledgeGraph.getAllNodes().length === 0) {
      this.knowledgeGraph.addNode({
        id: 'node_owner_root',
        label: 'Master Owner',
        type: 'OWNER',
        properties: { ownerId: MASTER_OWNER_ID },
      });
    }
  }

  /**
   * Process a Master Owner command.
   */
  public handleCommand(command: MasterOwnerCommand): DecisionResponse {
    if (this.isEmergencyStopped && command.type !== 'RESET' && command.type !== 'RESUME') {
      return {
        commandId: command.commandId,
        type: command.type,
        status: 'STOPPED',
        message: '[USER_STOP_ACTIVE] System is in emergency stopped state. Only RESET or explicit unhalt allowed.',
      };
    }

    if (command.type === 'STOP') {
      this.isEmergencyStopped = true;
    } else if (command.type === 'RESET') {
      this.isEmergencyStopped = false;
    }

    return this.decisionSupport.handleCommand(command);
  }

  /**
   * Propose an action for cognitive evaluation before execution.
   */
  public proposeAction(
    ownerId: string,
    proposal: {
      decision: string;
      targetPath?: string;
      requiredCapabilities?: string[];
      availableCapabilities?: string[];
      isDestructiveAction?: boolean;
      assumptions?: string[];
      missingEvidence?: string[];
    }
  ): {
    canProceed: boolean;
    isSafetyBlocked: boolean;
    challenge?: CognitiveChallenge;
    reason?: string;
  } {
    assertMasterOwner(ownerId, 'Propose action');

    // Retrieve contradictions & relevant memories
    const knownContradictions = this.contradictionEngine.getUnresolvedContradictions();
    const relevantMemories = this.relevanceEngine
      .selectRelevantContext({ objective: proposal.decision }, this.memoryStore.getAllMemories())
      .map((s) => s.item);

    const evalResult = this.challengeEngine.evaluateProposal({
      proposedDecision: proposal.decision,
      targetPath: proposal.targetPath,
      requiredCapabilities: proposal.requiredCapabilities,
      availableCapabilities: proposal.availableCapabilities,
      knownContradictions,
      relevantMemories,
      isDestructiveAction: proposal.isDestructiveAction,
      assumptions: proposal.assumptions,
      missingEvidence: proposal.missingEvidence,
    });

    if (evalResult.isMandatorySafetyBlock) {
      return {
        canProceed: false,
        isSafetyBlocked: true,
        challenge: evalResult.challenge,
        reason: `[MANDATORY_SAFETY_BLOCK] ${evalResult.challenge?.concern}`,
      };
    }

    if (evalResult.hasConcern) {
      return {
        canProceed: false,
        isSafetyBlocked: false,
        challenge: evalResult.challenge,
        reason: evalResult.challenge?.concern,
      };
    }

    return {
      canProceed: true,
      isSafetyBlocked: false,
    };
  }

  /**
   * Governed cycle: EXECUTE -> VERIFY -> EVALUATE -> LEARN.
   */
  public async executeGovernedCycle(
    ownerId: string,
    cycle: {
      actionId: string;
      expectedOutcome: string;
      executeFn: () => Promise<{ actualOutcome: string; success: boolean; verificationDetails?: any }>;
      assumptions?: string[];
      sideEffects?: string[];
    }
  ): Promise<OutcomeLearningRecord> {
    assertMasterOwner(ownerId, 'Execute governed cycle');

    if (this.isEmergencyStopped) {
      throw new Error('[USER_STOP] Cannot execute governed cycle while emergency stop is active.');
    }

    const execResult = await cycle.executeFn();

    const learningRecord = this.outcomeLearningEngine.evaluateOutcome(
      {
        actionId: cycle.actionId,
        expectedOutcome: cycle.expectedOutcome,
        actualOutcome: execResult.actualOutcome,
        executionVerified: execResult.success,
        verificationDetails: execResult.verificationDetails,
        assumptions: cycle.assumptions,
        sideEffectsObserved: cycle.sideEffects,
      },
      this.memoryStore,
      this.knowledgeGraph
    );

    // Update operating model with verified outcome
    this.reconstructCurrentWorldModel({
      lastVerifiedOutcome: `${learningRecord.actionId}: [${learningRecord.verdict}] ${learningRecord.actualOutcome}`,
    });

    return learningRecord;
  }

  /**
   * Record verified host observation into memory.
   */
  public recordObservation(fact: string, source: string, confidence: number = 0.95, tags: string[] = []): PersonalMemoryItem {
    return this.memoryStore.createMemory({
      ownerId: MASTER_OWNER_ID,
      category: 'IDENTITY',
      content: fact,
      source,
      confidence,
      certainty: 'HIGH',
      provenance: 'SYSTEM_OBSERVED',
      tags: [...tags, 'observation'],
    });
  }

  /**
   * Record explicit Owner preference into memory.
   */
  public recordOwnerPreference(preference: string, tags: string[] = []): PersonalMemoryItem {
    return this.memoryStore.createMemory({
      ownerId: MASTER_OWNER_ID,
      category: 'PREFERENCE',
      content: preference,
      source: 'MasterOwner:Explicit',
      confidence: 1.0,
      certainty: 'ABSOLUTE',
      provenance: 'OWNER_EXPLICIT',
      tags: [...tags, 'preference', 'owner'],
    });
  }

  /**
   * Reconstruct current world model.
   */
  public reconstructCurrentWorldModel(overrides?: {
    currentObjective?: string;
    currentTask?: string;
    lastVerifiedOutcome?: string;
  }): PersonalOperatingModel {
    return this.operatingModelManager.reconstructModel({
      memoryStore: this.memoryStore,
      knowledgeGraph: this.knowledgeGraph,
      contradictionEngine: this.contradictionEngine,
      currentObjective: overrides?.currentObjective,
      currentTask: overrides?.currentTask,
      lastVerifiedOutcome: overrides?.lastVerifiedOutcome,
    });
  }

  /**
   * Query context relevant to an objective.
   */
  public queryRelevantContext(query: ContextQuery): ScoredMemoryItem[] {
    return this.relevanceEngine.selectRelevantContext(query, this.memoryStore.getAllMemories());
  }

  /**
   * Detect and record contradiction.
   */
  public recordContradiction(
    type: ContradictionType,
    previousBelief: string,
    currentEvidence: string,
    action: string
  ): ContradictionRecord {
    return this.contradictionEngine.recordContradiction(type, previousBelief, currentEvidence, action);
  }

  /**
   * Self-correct an earlier assessment.
   */
  public selfCorrect(params: CreateSelfCorrectionParams): SelfCorrectionRecord {
    return this.selfCorrectionEngine.recordCorrection(params, this.memoryStore);
  }

  /**
   * Emergency stop query.
   */
  public isHalted(): boolean {
    return this.isEmergencyStopped;
  }
}
