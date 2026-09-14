// src/core/groundedPlanTaskBridge/groundedPlanPEPPreparationBridge.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN PEP PREPARATION BRIDGE
// Component 1053 — REAL
//
// EN: Declarative policy enforcement preparation bridge interfacing with PEP
//     to establish execution-readiness envelopes with zero execution authority.
// VI: Cầu nối chuẩn bị thực thi chính sách mang tính khai báo tương tác với PEP
//     để thiết lập phong bì sẵn sàng thực thi mà không chứa thẩm quyền thực thi.

import crypto from 'node:crypto';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import {
  GovernedPolicyEnforcementPoint,
  type GovernedPEPOptions,
} from '../policyEnforcement/governedPolicyEnforcementPoint.js';
import {
  type GroundedPlanTaskBinding,
  type PEPReadinessRecord,
  GroundedPlanTaskUserStopError,
  GroundedPlanTaskPEPError,
} from './groundedPlanTaskTypes.js';

export interface GroundedPlanPEPPreparationBridgeOptions {
  readonly pep?: GovernedPolicyEnforcementPoint;
  readonly userStopProvider?: () => boolean;
}

export class GroundedPlanPEPPreparationBridge {
  private readonly pep: GovernedPolicyEnforcementPoint;
  private readonly userStopProvider: () => boolean;

  constructor(options?: GroundedPlanPEPPreparationBridgeOptions) {
    this.pep = options?.pep ?? new GovernedPolicyEnforcementPoint();
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Evaluates execution readiness for all steps in the binding through PEP.
   * VI: Đánh giá tính sẵn sàng thực thi cho toàn bộ các bước trong ràng buộc thông qua PEP.
   */
  public preparePEPReadiness(binding: GroundedPlanTaskBinding): PEPReadinessRecord {
    // 1. Synchronous USER_STOP Preemption Gate
    if (this.userStopProvider()) {
      throw new GroundedPlanTaskUserStopError('prepare_pep_readiness');
    }

    let allPermitted = true;
    let requiresApproval = binding.requiresHumanConfirmation;
    const summaries: string[] = [];
    let representativeLeaseId: string | undefined;

    for (const step of binding.stepBindings) {
      if (this.userStopProvider()) {
        throw new GroundedPlanTaskUserStopError('pep_step_preparation');
      }

      // Prepare declarative enforcement context for PEP
      const simulatedToolName = this.mapStepToToolName(step);
      const enforcementDecision = this.pep.enforce({
        toolName: simulatedToolName,
        args: step.taskStepOptions.parameters as Record<string, any>,
        actor: { userId: binding.tenantId, role: 'owner', isOwner: true },
        tenantPartition: binding.tenantId,
      });

      if (enforcementDecision.classification === 'FORBIDDEN' || (!enforcementDecision.allowed && !enforcementDecision.requiresApproval)) {
        allPermitted = false;
        summaries.push(`[Step ${step.stepIndex}] DENIED: ${enforcementDecision.reason}`);
      } else if (enforcementDecision.requiresApproval) {
        requiresApproval = true;
        summaries.push(`[Step ${step.stepIndex}] CONFIRMATION_REQUIRED: ${enforcementDecision.reason}`);
      } else {
        summaries.push(`[Step ${step.stepIndex}] PERMITTED: ${enforcementDecision.reason}`);
        if (enforcementDecision.leaseId && !representativeLeaseId) {
          representativeLeaseId = enforcementDecision.leaseId;
        }
      }
    }

    const readinessId = `pep_readiness_${crypto.createHash('sha256').update(`${binding.bindingId}_${Date.now()}`).digest('hex').slice(0, 16)}`;

    const record: PEPReadinessRecord = Object.freeze({
      readinessId,
      bindingId: binding.bindingId,
      tenantId: binding.tenantId,
      allPermitted,
      requiresApproval,
      preparedLeaseId: representativeLeaseId,
      policySummary: summaries.join('; '),
      evaluatedAt: new Date().toISOString(),
    });

    return record;
  }

  /**
   * EN: Maps step binding capability/action to representative tool name for PEP evaluation.
   * VI: Ánh xạ năng lực/hành động của ràng buộc bước sang tên công cụ đại diện để đánh giá PEP.
   */
  private mapStepToToolName(step: { readonly taskStepOptions: { readonly actionName: string } }): string {
    const action = step.taskStepOptions.actionName;
    if (action === 'inspect_state' || action === 'navigate_url') {
      return 'desktop_capture_screenshot';
    }
    if (action === 'type_text') {
      return 'desktop_send_keys';
    }
    if (action === 'select_option' || action === 'confirm_action') {
      return 'desktop_mouse_action';
    }
    return 'generic_action_proposal';
  }
}
