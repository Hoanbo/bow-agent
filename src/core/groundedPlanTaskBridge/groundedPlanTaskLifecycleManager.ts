// src/core/groundedPlanTaskBridge/groundedPlanTaskLifecycleManager.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN TASK LIFECYCLE MANAGER
// Component 1054 — REAL
//
// EN: Governed lifecycle state machine managing transitions between GroundedActionPlan
//     and AgentTask envelopes, enforcing OCC CAS checks, audit ledger logging, and USER_STOP.
// VI: Máy trạng thái vòng đời có quản trị điều phối các chuyển đổi giữa các phong bì
//     GroundedActionPlan và AgentTask, thực thi OCC CAS, ghi nhật ký kiểm toán và USER_STOP.

import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { AgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import {
  type GroundedPlanTaskBinding,
  type GroundedPlanTaskLifecycleState,
  GroundedPlanTaskUserStopError,
  GroundedPlanTaskLifecycleError,
  GroundedPlanTaskConcurrencyError,
  computeBindingProvenanceHash,
} from './groundedPlanTaskTypes.js';

export interface GroundedPlanTaskLifecycleOptions {
  readonly taskRuntime?: AgentTaskRuntime;
  readonly auditLedger?: AuditLedger;
  readonly userStopProvider?: () => boolean;
}

const VALID_LIFECYCLE_TRANSITIONS: Record<GroundedPlanTaskLifecycleState, GroundedPlanTaskLifecycleState[]> = {
  DRAFT: ['BOUND', 'CANCELLED', 'REJECTED'],
  BOUND: ['PRECONDITIONS_VERIFIED', 'REJECTED', 'CANCELLED'],
  PRECONDITIONS_VERIFIED: ['HUMAN_CONFIRMATION_REQUIRED', 'PDP_APPROVED', 'REJECTED', 'CANCELLED'],
  HUMAN_CONFIRMATION_REQUIRED: ['HUMAN_CONFIRMED', 'REJECTED', 'CANCELLED'],
  HUMAN_CONFIRMED: ['PDP_APPROVED', 'REJECTED', 'CANCELLED'],
  PDP_APPROVED: ['PEP_READY', 'DENIED', 'REJECTED', 'CANCELLED'],
  PEP_READY: ['TASK_SUBMITTED', 'REJECTED', 'CANCELLED'],
  TASK_SUBMITTED: ['HANDOFF_READY', 'CANCELLED', 'INVALIDATED'],
  HANDOFF_READY: ['CANCELLED', 'INVALIDATED'],
  DENIED: [],
  REJECTED: [],
  CANCELLED: [],
  PREEMPTED: [],
  INVALIDATED: [],
};

export class GroundedPlanTaskLifecycleManager {
  private readonly taskRuntime: AgentTaskRuntime;
  private readonly auditLedger: AuditLedger;
  private readonly userStopProvider: () => boolean;

  constructor(options?: GroundedPlanTaskLifecycleOptions) {
    this.taskRuntime = options?.taskRuntime ?? new AgentTaskRuntime();
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Evaluates if a state transition is valid from the current state.
   * VI: Đánh giá xem một bước chuyển trạng thái có hợp lệ từ trạng thái hiện tại không.
   */
  public isValidTransition(
    current: GroundedPlanTaskLifecycleState,
    next: GroundedPlanTaskLifecycleState
  ): boolean {
    if (next === 'PREEMPTED') return true; // Global USER_STOP can preempt any non-terminal state
    const allowed = VALID_LIFECYCLE_TRANSITIONS[current] ?? [];
    return allowed.includes(next);
  }

  /**
   * EN: Transitions binding to next lifecycle state with OCC CAS validation.
   * VI: Chuyển đổi ràng buộc sang trạng thái tiếp theo với xác thực OCC CAS.
   */
  public transitionState(
    binding: GroundedPlanTaskBinding,
    nextState: GroundedPlanTaskLifecycleState,
    expectedVersion: number,
    reason: string = 'Governed state transition'
  ): GroundedPlanTaskBinding {
    // 1. Synchronous USER_STOP Preemption Gate
    if (this.userStopProvider()) {
      throw new GroundedPlanTaskUserStopError('transition_state');
    }

    // 2. OCC / CAS Check
    if (binding.sessionVersion !== expectedVersion) {
      throw new GroundedPlanTaskConcurrencyError(expectedVersion, binding.sessionVersion, {
        bindingId: binding.bindingId,
        currentState: binding.lifecycleState,
        attemptedNextState: nextState,
      });
    }

    // 3. State Machine Transition Legality
    if (!this.isValidTransition(binding.lifecycleState, nextState)) {
      throw new GroundedPlanTaskLifecycleError(
        `Illegal transition from "${binding.lifecycleState}" to "${nextState}" for binding "${binding.bindingId}"`,
        { currentState: binding.lifecycleState, nextState }
      );
    }

    let agentTaskId = binding.agentTaskId;

    // 4. If transitioning to TASK_SUBMITTED, safely invoke AgentTaskRuntime to register task envelope
    if (nextState === 'TASK_SUBMITTED' && !agentTaskId) {
      const createdTask = this.taskRuntime.createTask(binding.taskSpecification);
      agentTaskId = createdTask.taskId;
    }

    const updatedSessionVersion = binding.sessionVersion + 1;
    const now = new Date().toISOString();

    const partialBinding = {
      ...binding,
      lifecycleState: nextState,
      agentTaskId,
      sessionVersion: updatedSessionVersion,
      updatedAt: now,
    };

    const provenanceHash = computeBindingProvenanceHash(partialBinding);

    const updatedBinding: GroundedPlanTaskBinding = Object.freeze({
      ...partialBinding,
      provenanceHash,
    });

    // 5. Audit Ledger Logging
    try {
      this.auditLedger.record({
        timestamp: now,
        actor: {
          userId: binding.tenantId,
          role: 'SYSTEM_GOVERNED_PLANNER',
          channel: 'INTERNAL_TASK_BRIDGE',
        },
        domain: 'GROUNDED_PLAN_TASK_BRIDGE',
        toolName: `transition_${nextState}`,
        classification: 'SAFE',
        argumentsHash: provenanceHash,
        policyDecision: nextState === 'DENIED' || nextState === 'REJECTED' ? 'DENY' : 'PERMIT',
        executionStatus: nextState === 'DENIED' || nextState === 'REJECTED' ? 'BLOCKED' : 'SUCCESS',
      });
    } catch {
      // Audit ledger failure does not block governance progression
    }

    return updatedBinding;
  }
}
