// src/core/groundedPlanning/groundedPlanLifecycleManager.ts
// BOWCON V4.0 — MS-1.5.07: GROUNDED PLAN LIFECYCLE MANAGER
// Component 1043 — REAL
//
// EN: Enforces governed lifecycle state machine transitions, OCC version CAS checks,
//     and synchronous USER_STOP preemption for GroundedActionPlans.
// VI: Thực thi chuyển đổi máy trạng thái vòng đời có kiểm soát, kiểm tra phiên bản OCC CAS,
//     và dừng khẩn cấp đồng bộ USER_STOP cho GroundedActionPlans.

import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import {
  type GroundedActionPlan,
  type GroundedPlanStatus,
  GroundedPlanValidationError,
  GroundedPlanConcurrencyError,
  GroundedPlanUserStopError,
  computePlanProvenanceHash,
} from './groundedPlanTypes.js';
import { GroundedPlanValidator } from './groundedPlanValidator.js';

const ALLOWED_TRANSITIONS: Record<GroundedPlanStatus, readonly GroundedPlanStatus[]> = {
  DRAFT: Object.freeze(['SYNTHESIZED', 'REJECTED']),
  SYNTHESIZED: Object.freeze(['VALIDATED', 'REJECTED', 'SUPERSEDED']),
  VALIDATED: Object.freeze(['SUBMITTED_TO_PDP', 'REJECTED', 'SUPERSEDED']),
  SUBMITTED_TO_PDP: Object.freeze(['SUPERSEDED', 'REJECTED']),
  REJECTED: Object.freeze([]), // Terminal state
  SUPERSEDED: Object.freeze([]), // Terminal state
};

export interface GroundedPlanLifecycleManagerOptions {
  readonly userStopProvider?: () => boolean;
}

export class GroundedPlanLifecycleManager {
  private readonly userStopProvider: () => boolean;

  constructor(options?: GroundedPlanLifecycleManagerOptions) {
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Transitions plan to target status with OCC CAS validation and USER_STOP assertion.
   * VI: Chuyển đổi trạng thái kế hoạch với kiểm tra OCC CAS và dừng khẩn cấp USER_STOP.
   */
  public transitionStatus(
    currentPlan: GroundedActionPlan,
    targetStatus: GroundedPlanStatus,
    expectedVersion: number,
    mutationContext?: { rationale?: string }
  ): GroundedActionPlan {
    // 1. Synchronous USER_STOP Preemption (Kiểm tra quyền dừng khẩn cấp)
    if (this.userStopProvider()) {
      throw new GroundedPlanUserStopError(`lifecycle_transition_${targetStatus}`);
    }

    // 2. OCC / CAS Version Validation (Xác thực phiên bản OCC / CAS)
    if (currentPlan.planVersion !== expectedVersion) {
      throw new GroundedPlanConcurrencyError(expectedVersion, currentPlan.planVersion, {
        planId: currentPlan.planId,
        currentStatus: currentPlan.status,
        targetStatus,
      });
    }

    // 3. Allowed Transition Validation (Xác thực chuyển đổi trạng thái hợp lệ)
    const allowed = ALLOWED_TRANSITIONS[currentPlan.status];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new GroundedPlanValidationError(
        `Illegal lifecycle transition from '${currentPlan.status}' to '${targetStatus}' for plan '${currentPlan.planId}'`
      );
    }

    const now = new Date().toISOString();
    const updatedDraft: Omit<GroundedActionPlan, 'provenanceHash'> = {
      ...currentPlan,
      status: targetStatus,
      planVersion: currentPlan.planVersion + 1,
      updatedAt: now,
      rationale: mutationContext?.rationale ?? currentPlan.rationale,
    };

    const provenanceHash = computePlanProvenanceHash(updatedDraft);
    const transitioned: GroundedActionPlan = Object.freeze({
      ...updatedDraft,
      provenanceHash,
    });

    GroundedPlanValidator.validatePlan(transitioned);
    return transitioned;
  }
}
