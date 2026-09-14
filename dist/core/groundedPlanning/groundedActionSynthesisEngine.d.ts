import { type GroundedActionPlan, type GroundedActionStep, type GroundedPlanSynthesisRequest } from './groundedPlanTypes.js';
export interface SynthesisEngineOptions {
    readonly userStopProvider?: () => boolean;
    readonly defaultMinConfidence?: number;
}
export declare class GroundedActionSynthesisEngine {
    private readonly userStopProvider;
    private readonly defaultMinConfidence;
    constructor(options?: SynthesisEngineOptions);
    /**
     * EN: Synthesizes a grounded action plan from multi-modal inputs.
     * VI: Tổng hợp kế hoạch hành động gắn kết từ các đầu vào đa phương thức.
     */
    synthesizePlan(request: GroundedPlanSynthesisRequest, options?: {
        additionalSteps?: readonly Omit<GroundedActionStep, 'stepId' | 'stepIndex' | 'stepHash'>[];
    }): GroundedActionPlan;
}
