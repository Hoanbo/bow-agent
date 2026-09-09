import { BowconSelfModelEngine } from './bowconSelfModelEngine.js';
import { MasterOwnerWorldModelManager } from './masterOwnerWorldModelManager.js';
import { CapabilityGroundedReasoningEngine, PlanRequirementSpec } from './capabilityGroundedReasoningEngine.js';
import { InformationGapEngine } from './informationGapEngine.js';
import { WorldModelContradictionEngine } from './worldModelContradictionEngine.js';
import { EnhancedSelfCorrectionEngine } from './enhancedSelfCorrectionEngine.js';
import type { CapabilityPlanFeasibility, MasterOwnerWorldModelSnapshot } from './worldModelTypes.js';
export declare class MasterOwnerWorldModelRuntime {
    readonly selfModel: BowconSelfModelEngine;
    readonly worldModel: MasterOwnerWorldModelManager;
    readonly reasoning: CapabilityGroundedReasoningEngine;
    readonly gaps: InformationGapEngine;
    readonly contradictions: WorldModelContradictionEngine;
    readonly selfCorrection: EnhancedSelfCorrectionEngine;
    private _isStopped;
    private _stopReason;
    constructor(selfModel?: BowconSelfModelEngine, worldModel?: MasterOwnerWorldModelManager, reasoning?: CapabilityGroundedReasoningEngine, gaps?: InformationGapEngine, contradictions?: WorldModelContradictionEngine, selfCorrection?: EnhancedSelfCorrectionEngine);
    /**
     * Universal Emergency Stop. Preempts all autonomous execution and cognitive loops.
     */
    emergencyStop(reason?: string): void;
    resetEmergencyStop(operatorId: string): void;
    isStopped(): boolean;
    getStopReason(): string;
    /**
     * Executes a complete cognitive observation and grounding cycle.
     */
    runCognitiveCycle(): {
        snapshot: MasterOwnerWorldModelSnapshot;
        activeGapsCount: number;
        unresolvedContradictionsCount: number;
        stalenessChecked: boolean;
    };
    /**
     * Assesses the grounded feasibility of a proposed plan.
     */
    evaluatePlan(spec: PlanRequirementSpec, activeTokens?: string[]): CapabilityPlanFeasibility;
    /**
     * Generates a grounded operational briefing for the Master Owner.
     */
    getBriefing(): string;
}
export declare const globalMasterOwnerWorldModelRuntime: MasterOwnerWorldModelRuntime;
