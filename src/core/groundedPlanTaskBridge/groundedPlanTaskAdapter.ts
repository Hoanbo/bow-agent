// src/core/groundedPlanTaskBridge/groundedPlanTaskAdapter.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN TASK ADAPTER
// Component 1050 — REAL
//
// EN: Deterministically transforms an approved GroundedActionPlan into an AgentTask
//     specification and task-binding envelope with zero execution authority.
// VI: Chuyển đổi có tính xác định một GroundedActionPlan đã phê duyệt thành đặc tả
//     Nhiệm vụ Agent và phong bì ràng buộc nhiệm vụ mà không có thẩm quyền thực thi.

import crypto from 'node:crypto';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import type { GroundedActionPlan, GroundedActionStep } from '../groundedPlanning/groundedPlanTypes.js';
import type { CreateAgentTaskOptions, CreateTaskStepOptions } from '../taskLifecycle/agentTaskTypes.js';
import {
  type GroundedPlanTaskBinding,
  type GroundedPlanTaskStepBinding,
  GROUNDED_PLAN_TASK_SCHEMA_VERSION,
  GroundedPlanTaskUserStopError,
  computeStepBindingHash,
  computeBindingProvenanceHash,
} from './groundedPlanTaskTypes.js';
import { GroundedPlanTaskValidator } from './groundedPlanTaskValidator.js';

export interface GroundedPlanTaskAdapterOptions {
  readonly userStopProvider?: () => boolean;
}

export class GroundedPlanTaskAdapter {
  private readonly userStopProvider: () => boolean;

  constructor(options?: GroundedPlanTaskAdapterOptions) {
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Transforms an approved GroundedActionPlan into an immutable GroundedPlanTaskBinding.
   * VI: Chuyển đổi một GroundedActionPlan đã duyệt thành một GroundedPlanTaskBinding bất biến.
   */
  public adaptPlanToTaskBinding(plan: GroundedActionPlan): GroundedPlanTaskBinding {
    // 1. Synchronous USER_STOP Preemption Gate
    if (this.userStopProvider()) {
      throw new GroundedPlanTaskUserStopError('adapt_plan_to_task_binding');
    }

    // 2. Pure fails-closed validation of source plan
    GroundedPlanTaskValidator.validateSourcePlan(plan);

    const bindingId = `bind_${crypto.createHash('sha256').update(`${plan.planId}_${plan.planVersion}_${Date.now()}`).digest('hex').slice(0, 16)}`;

    // 3. Transform individual steps
    const stepBindings: GroundedPlanTaskStepBinding[] = [];
    const taskSteps: CreateTaskStepOptions[] = [];

    for (let i = 0; i < plan.steps.length; i++) {
      if (this.userStopProvider()) {
        throw new GroundedPlanTaskUserStopError('adapt_step_binding');
      }

      const step = plan.steps[i];
      const stepBinding = this.adaptStep(step, bindingId, i);
      stepBindings.push(stepBinding);
      taskSteps.push(stepBinding.taskStepOptions);
    }

    // 4. Construct CreateAgentTaskOptions specification
    const taskSpecification: CreateAgentTaskOptions = Object.freeze({
      tenantId: plan.tenantId,
      userId: plan.tenantId,
      title: `Task for Plan: ${plan.title}`,
      intent: plan.description,
      riskLevel: plan.overallRiskLevel,
      steps: Object.freeze(taskSteps),
    });

    const now = new Date().toISOString();

    const partialBinding = {
      bindingId,
      schemaVersion: GROUNDED_PLAN_TASK_SCHEMA_VERSION,
      tenantId: plan.tenantId,
      sessionId: plan.sessionId,
      sourcePlanId: plan.planId,
      sourcePlanVersion: plan.planVersion,
      sourcePlanProvenanceHash: plan.provenanceHash,
      taskSpecification,
      stepBindings: Object.freeze(stepBindings),
      preconditionResults: Object.freeze([]),
      riskLevel: plan.overallRiskLevel,
      requiresHumanConfirmation: plan.requiresHumanConfirmation,
      lifecycleState: 'BOUND' as const,
      createdAt: now,
      updatedAt: now,
      sessionVersion: 1,
    };

    const provenanceHash = computeBindingProvenanceHash(partialBinding);

    const binding: GroundedPlanTaskBinding = Object.freeze({
      ...partialBinding,
      provenanceHash,
    });

    // 5. Final validation of produced binding
    GroundedPlanTaskValidator.validateBinding(binding);

    return binding;
  }

  /**
   * EN: Deterministically maps a GroundedActionStep into a GroundedPlanTaskStepBinding.
   * VI: Ánh xạ xác định một GroundedActionStep thành một GroundedPlanTaskStepBinding.
   */
  public adaptStep(
    step: GroundedActionStep,
    bindingId: string,
    index: number
  ): GroundedPlanTaskStepBinding {
    const stepBindingId = `sbind_${crypto.createHash('sha256').update(`${bindingId}_${step.stepId}_${index}`).digest('hex').slice(0, 16)}`;

    const { capabilityId, actionName } = this.mapIntentToCapabilityAction(step);

    const taskStepOptions: CreateTaskStepOptions = Object.freeze({
      description: step.description,
      capabilityId,
      actionName,
      parameters: Object.freeze({
        ...step.payload,
        intentType: step.intentType,
        targetElementId: step.targetElementId,
        targetElementHash: step.targetElementHash,
        sourceStepId: step.stepId,
        dependsOnStepIds: step.dependsOnStepIds,
        preconditions: step.preconditions,
        postconditions: step.postconditions,
        isQuarantinedText: step.isQuarantinedText,
      }),
      riskLevel: step.riskLevel,
      requiresApproval:
        step.riskLevel === 'CRITICAL' ||
        step.riskLevel === 'HIGH' ||
        step.isQuarantinedText,
      maxAttempts: 3,
    });

    const partialStepBinding = {
      stepBindingId,
      sourceStepId: step.stepId,
      stepIndex: index,
      taskStepOptions,
      preconditions: Object.freeze([...step.preconditions]),
      preconditionResults: Object.freeze([]),
      riskLevel: step.riskLevel,
      requiresApproval: taskStepOptions.requiresApproval ?? false,
      isQuarantinedText: step.isQuarantinedText,
    };

    const stepProvenanceHash = computeStepBindingHash(partialStepBinding);

    return Object.freeze({
      ...partialStepBinding,
      stepProvenanceHash,
    });
  }

  /**
   * EN: Maps plan intent type to representative capabilityId and actionName.
   * VI: Ánh xạ loại ý định của kế hoạch sang capabilityId và actionName đại diện.
   */
  private mapIntentToCapabilityAction(step: GroundedActionStep): { capabilityId: string; actionName: string } {
    switch (step.intentType) {
      case 'NAVIGATE':
        return { capabilityId: 'browser_navigation', actionName: 'navigate_url' };
      case 'INSPECT':
        return { capabilityId: 'desktop_observation', actionName: 'inspect_state' };
      case 'INPUT_TEXT':
        return { capabilityId: 'desktop_interaction', actionName: 'type_text' };
      case 'SELECT_ELEMENT':
        return { capabilityId: 'desktop_interaction', actionName: 'select_option' };
      case 'CONFIRM':
        return { capabilityId: 'flow_control', actionName: 'confirm_action' };
      case 'CANCEL':
        return { capabilityId: 'flow_control', actionName: 'cancel_action' };
      case 'CUSTOM':
      default:
        return { capabilityId: 'custom_capability', actionName: 'custom_action' };
    }
  }
}
