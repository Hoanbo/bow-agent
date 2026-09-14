// src/core/groundedPlanning/groundedPlanPDPBridge.ts
// BOWCON V4.0 — MS-1.5.07: GROUNDED PLAN PDP BRIDGE
// Component 1044 — REAL
//
// EN: Translates declarative grounded action plan steps into PolicyEvaluationContext
//     for the authoritative PolicyDecisionPoint (PDP) with zero execution authority.
// VI: Chuyển đổi các bước kế hoạch hành động gắn kết mang tính khai báo thành ngữ cảnh
//     đánh giá cho PolicyDecisionPoint (PDP) mà không chứa thẩm quyền thực thi.

import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import {
  type PolicyDecision,
  type ActionClassification,
  PolicyDecisionPoint,
  globalPDP,
} from '../policyDecisionPoint.js';
import {
  type GroundedActionPlan,
  type GroundedActionStep,
  GroundedPlanUserStopError,
} from './groundedPlanTypes.js';

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

export class GroundedPlanPDPBridge {
  private readonly pdp: PolicyDecisionPoint;
  private readonly userStopProvider: () => boolean;

  constructor(options?: PlanPDPBridgeOptions) {
    this.pdp = options?.pdp ?? globalPDP;
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Evaluates entire action plan against PDP policies without executing any action.
   * VI: Đánh giá toàn bộ kế hoạch hành động theo chính sách PDP mà không thực thi bất kỳ hành động nào.
   */
  public evaluatePlanPolicy(plan: GroundedActionPlan): PlanPolicyEvaluationResult {
    // 1. Synchronous USER_STOP Preemption Gate
    if (this.userStopProvider()) {
      throw new GroundedPlanUserStopError('pdp_bridge_policy_evaluation');
    }

    const stepEvaluations: StepPolicyEvaluation[] = [];
    let allPermitted = true;
    let requiresHumanApproval = plan.requiresHumanConfirmation;

    for (const step of plan.steps) {
      if (this.userStopProvider()) {
        throw new GroundedPlanUserStopError('pdp_bridge_step_evaluation');
      }

      const evalResult = this.evaluateStep(step, plan.tenantId);
      stepEvaluations.push(evalResult);

      if (!evalResult.decision.allowed) {
        allPermitted = false;
      }
      if (evalResult.requiresHumanApproval || evalResult.decision.requiresApproval) {
        requiresHumanApproval = true;
      }
    }

    return Object.freeze({
      planId: plan.planId,
      tenantId: plan.tenantId,
      allPermitted,
      requiresHumanApproval,
      stepEvaluations: Object.freeze(stepEvaluations),
      evaluatedAt: new Date().toISOString(),
    });
  }

  /**
   * EN: Evaluates a single action step against PDP classification rules.
   * VI: Đánh giá một bước hành động theo quy tắc phân loại của PDP.
   */
  public evaluateStep(step: GroundedActionStep, tenantId: string): StepPolicyEvaluation {
    // Map GroundedPlanIntentType to a representative tool name for PDP classification
    const simulatedToolName = this.mapIntentToToolName(step);

    const classification = this.pdp.getActionClassification(simulatedToolName);
    const decisionResult = this.pdp.evaluate({
      toolName: simulatedToolName,
      args: step.payload as Record<string, any>,
      actor: { userId: tenantId },
    });

    const requiresHuman =
      step.riskLevel === 'CRITICAL' ||
      step.riskLevel === 'HIGH' ||
      classification === 'HIGH_IMPACT' ||
      classification === 'FORBIDDEN' ||
      step.isQuarantinedText ||
      decisionResult.requiresApproval;

    return Object.freeze({
      stepId: step.stepId,
      stepIndex: step.stepIndex,
      classification,
      decision: decisionResult,
      reason: decisionResult.reason,
      requiresHumanApproval: requiresHuman,
    });
  }

  private mapIntentToToolName(step: GroundedActionStep): string {
    switch (step.intentType) {
      case 'INPUT_TEXT':
        return 'desktop_send_keys';
      case 'SELECT_ELEMENT':
      case 'CONFIRM':
      case 'CANCEL':
        return 'desktop_mouse_action';
      case 'NAVIGATE':
      case 'INSPECT':
        return 'desktop_capture_screenshot';
      case 'CUSTOM':
      default:
        return 'generic_action_proposal';
    }
  }
}
