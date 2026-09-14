import { type PolicyDecision, type ActionClassification, PolicyDecisionPoint } from '../policyDecisionPoint.js';
import { type GroundedActionPlan, type GroundedActionStep } from './groundedPlanTypes.js';
export interface StepPolicyEvaluation {
    readonly stepId: string;
    readonly stepIndex: number;
    readonly classification: ActionClassification;
    readonly decision: PolicyDecision;
    readonly reason: string;
    readonly requiresHumanApproval: boolean;
}
export interface PlanPolicyEvaluationResult {
    readonly planId: string;
    readonly tenantId: string;
    readonly allPermitted: boolean;
    readonly requiresHumanApproval: boolean;
    readonly stepEvaluations: readonly StepPolicyEvaluation[];
    readonly evaluatedAt: string;
}
export interface PlanPDPBridgeOptions {
    readonly pdp?: PolicyDecisionPoint;
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanPDPBridge {
    private readonly pdp;
    private readonly userStopProvider;
    constructor(options?: PlanPDPBridgeOptions);
    /**
     * EN: Evaluates entire action plan against PDP policies without executing any action.
     * VI: Đánh giá toàn bộ kế hoạch hành động theo chính sách PDP mà không thực thi bất kỳ hành động nào.
     */
    evaluatePlanPolicy(plan: GroundedActionPlan): PlanPolicyEvaluationResult;
    /**
     * EN: Evaluates a single action step against PDP classification rules.
     * VI: Đánh giá một bước hành động theo quy tắc phân loại của PDP.
     */
    evaluateStep(step: GroundedActionStep, tenantId: string): StepPolicyEvaluation;
    private mapIntentToToolName;
}
