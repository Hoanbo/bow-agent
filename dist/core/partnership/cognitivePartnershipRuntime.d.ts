import { PersonalMemoryStore } from './personalMemoryStore';
import { PersonalKnowledgeGraph } from './personalKnowledgeGraph';
import { ContextRelevanceEngine, ContextQuery, ScoredMemoryItem } from './contextRelevanceEngine';
import { ContradictionEngine } from './contradictionEngine';
import { CognitiveChallengeEngine } from './cognitiveChallengeEngine';
import { SelfCorrectionEngine, CreateSelfCorrectionParams } from './selfCorrectionEngine';
import { OutcomeLearningEngine } from './outcomeLearningEngine';
import { PersonalDecisionSupport, DecisionResponse } from './personalDecisionSupport';
import { PersonalOperatingModelManager } from './personalOperatingModel';
import { MasterOwnerCommand, CognitiveChallenge, ContradictionType, ContradictionRecord, SelfCorrectionRecord, OutcomeLearningRecord, PersonalOperatingModel, PersonalMemoryItem } from './partnershipTypes';
export interface CognitivePartnershipRuntimeOptions {
    memoryStoragePath?: string;
    graphStoragePath?: string;
    modelStoragePath?: string;
}
export declare class CognitivePartnershipRuntime {
    readonly memoryStore: PersonalMemoryStore;
    readonly knowledgeGraph: PersonalKnowledgeGraph;
    readonly relevanceEngine: ContextRelevanceEngine;
    readonly contradictionEngine: ContradictionEngine;
    readonly challengeEngine: CognitiveChallengeEngine;
    readonly selfCorrectionEngine: SelfCorrectionEngine;
    readonly outcomeLearningEngine: OutcomeLearningEngine;
    readonly decisionSupport: PersonalDecisionSupport;
    readonly operatingModelManager: PersonalOperatingModelManager;
    private isEmergencyStopped;
    constructor(options?: CognitivePartnershipRuntimeOptions);
    /**
     * Process a Master Owner command.
     */
    handleCommand(command: MasterOwnerCommand): DecisionResponse;
    /**
     * Propose an action for cognitive evaluation before execution.
     */
    proposeAction(ownerId: string, proposal: {
        decision: string;
        targetPath?: string;
        requiredCapabilities?: string[];
        availableCapabilities?: string[];
        isDestructiveAction?: boolean;
        assumptions?: string[];
        missingEvidence?: string[];
    }): {
        canProceed: boolean;
        isSafetyBlocked: boolean;
        challenge?: CognitiveChallenge;
        reason?: string;
    };
    /**
     * Governed cycle: EXECUTE -> VERIFY -> EVALUATE -> LEARN.
     */
    executeGovernedCycle(ownerId: string, cycle: {
        actionId: string;
        expectedOutcome: string;
        executeFn: () => Promise<{
            actualOutcome: string;
            success: boolean;
            verificationDetails?: any;
        }>;
        assumptions?: string[];
        sideEffects?: string[];
    }): Promise<OutcomeLearningRecord>;
    /**
     * Record verified host observation into memory.
     */
    recordObservation(fact: string, source: string, confidence?: number, tags?: string[]): PersonalMemoryItem;
    /**
     * Record explicit Owner preference into memory.
     */
    recordOwnerPreference(preference: string, tags?: string[]): PersonalMemoryItem;
    /**
     * Reconstruct current world model.
     */
    reconstructCurrentWorldModel(overrides?: {
        currentObjective?: string;
        currentTask?: string;
        lastVerifiedOutcome?: string;
    }): PersonalOperatingModel;
    /**
     * Query context relevant to an objective.
     */
    queryRelevantContext(query: ContextQuery): ScoredMemoryItem[];
    /**
     * Detect and record contradiction.
     */
    recordContradiction(type: ContradictionType, previousBelief: string, currentEvidence: string, action: string): ContradictionRecord;
    /**
     * Self-correct an earlier assessment.
     */
    selfCorrect(params: CreateSelfCorrectionParams): SelfCorrectionRecord;
    /**
     * Emergency stop query.
     */
    isHalted(): boolean;
}
