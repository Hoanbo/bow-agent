// src/core/governedExecution/executionAuthorizationVerifier.ts
// BOWCON V4.0 — MS-1.5.09: EXECUTION AUTHORIZATION VERIFIER
// Component 1060 — REAL
//
// EN: Verifies the end-to-end cryptographic and policy authorization chain:
//     GroundedActionPlan -> GroundedPlanTaskBinding -> AgentTask -> PDP -> PEP -> Human Confirmation -> Lease.
// VI: Xác minh chuỗi ủy quyền mật mã và chính sách từ đầu đến cuối:
//     Kế hoạch gắn kết -> Ràng buộc nhiệm vụ -> Nhiệm vụ Agent -> PDP -> PEP -> Xác nhận con người -> Hợp đồng thuê.

import {
  type ExecutionAuthorizationEnvelope,
  type ExecutionLease,
  ExecutionAuthorizationError,
  ExecutionTenantIsolationError,
  ExecutionSessionIsolationError,
  computeAuthorizationHash,
} from './executionTypes.js';
import {
  type GroundedPlanTaskBinding,
  computeHumanConfirmationSignature,
} from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface AuthorizationVerificationParams {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly binding: GroundedPlanTaskBinding;
  readonly task: AgentTask;
  readonly stepIndex: number;
  readonly lease: ExecutionLease;
}

export class ExecutionAuthorizationVerifier {
  /**
   * EN: Verifies that an execution request possesses an unbroken, tamper-free authorization chain.
   * VI: Xác minh rằng yêu cầu thực thi sở hữu một chuỗi ủy quyền không bị đứt đoạn và không bị can thiệp.
   */
  public static verifyAuthorizationChain(params: AuthorizationVerificationParams): ExecutionAuthorizationEnvelope {
    const { tenantId, sessionId, binding, task, stepIndex, lease } = params;

    // 1. Cross-Tenant Isolation Enforcement
    if (binding.tenantId !== tenantId) {
      throw new ExecutionTenantIsolationError(tenantId, binding.tenantId);
    }
    if (task.tenantId !== tenantId) {
      throw new ExecutionTenantIsolationError(tenantId, task.tenantId);
    }
    if (lease.tenantId !== tenantId) {
      throw new ExecutionTenantIsolationError(tenantId, lease.tenantId);
    }

    // 2. Cross-Session Isolation Enforcement
    if (binding.sessionId !== sessionId) {
      throw new ExecutionSessionIsolationError(sessionId, binding.sessionId);
    }
    if (lease.sessionId !== sessionId) {
      throw new ExecutionSessionIsolationError(sessionId, lease.sessionId);
    }

    // 3. Task & Binding Coherence
    if (binding.agentTaskId && binding.agentTaskId !== task.taskId) {
      throw new ExecutionAuthorizationError(
        `Binding agentTaskId "${binding.agentTaskId}" does not match provided task "${task.taskId}"`
      );
    }

    // 4. Step Bounds & Association
    if (stepIndex < 0 || stepIndex >= task.steps.length) {
      throw new ExecutionAuthorizationError(`Step index ${stepIndex} is out of bounds for task ${task.taskId}`);
    }
    const targetTaskStep = task.steps[stepIndex];
    if (!targetTaskStep) {
      throw new ExecutionAuthorizationError(`Task step at index ${stepIndex} not found`);
    }

    if (stepIndex >= binding.stepBindings.length) {
      throw new ExecutionAuthorizationError(
        `Step index ${stepIndex} exceeds binding stepBindings length (${binding.stepBindings.length})`
      );
    }
    const targetStepBinding = binding.stepBindings[stepIndex];
    if (!targetStepBinding) {
      throw new ExecutionAuthorizationError(`Step binding at index ${stepIndex} not found`);
    }

    // 5. Preconditions Verification Check
    const unverifiedPreconditions = targetStepBinding.preconditionResults.filter(
      (r) => !r.satisfied || r.status !== 'SATISFIED'
    );
    if (unverifiedPreconditions.length > 0) {
      throw new ExecutionAuthorizationError(
        `Step ${stepIndex} contains ${unverifiedPreconditions.length} unsatisfied preconditions`
      );
    }

    // 6. PDP Verdict Verification
    const pdpDecision = binding.pdpDecision;
    if (!pdpDecision) {
      throw new ExecutionAuthorizationError('Binding is missing PDP decision evaluation');
    }

    const stepEval =
      pdpDecision.stepEvaluations?.find((s) => s.stepIndex === stepIndex) ??
      pdpDecision.stepEvaluations?.[stepIndex];

    const stepPolicy = stepEval?.decision;
    const isAllowed = stepPolicy ? stepPolicy.allowed : pdpDecision.allPermitted;
    const stepRequiresApproval = stepPolicy ? stepPolicy.requiresApproval : pdpDecision.requiresHumanApproval;
    const pdpVerdict: 'PERMIT' | 'DENY' | 'REQUIRES_CONFIRMATION' = !isAllowed
      ? 'DENY'
      : stepRequiresApproval
      ? 'REQUIRES_CONFIRMATION'
      : 'PERMIT';

    if (pdpVerdict === 'DENY') {
      throw new ExecutionAuthorizationError(
        `PDP evaluation denied plan execution: ${stepPolicy?.reason || 'Policy prohibited'}`
      );
    }

    // 7. Human Confirmation Gate Verification (Mandatory for HIGH/CRITICAL or REQUIRES_CONFIRMATION)
    const effectiveRisk = targetStepBinding.riskLevel || binding.riskLevel;
    const requiresHuman =
      binding.requiresHumanConfirmation ||
      effectiveRisk === 'HIGH' ||
      effectiveRisk === 'CRITICAL' ||
      pdpDecision.requiresHumanApproval ||
      stepRequiresApproval ||
      pdpVerdict === 'REQUIRES_CONFIRMATION';

    let humanSignature: string | undefined;

    if (requiresHuman) {
      if (!binding.humanConfirmation) {
        throw new ExecutionAuthorizationError(
          `Execution authorization failed: Step ${stepIndex} (Risk: ${effectiveRisk}) requires genuine human confirmation`
        );
      }

      const humanRecord = binding.humanConfirmation;

      // 1. Verify operator is authorized Master Human Authority
      if (!globalMasterHumanAuthority.isMasterOperator(humanRecord.operatorId)) {
        throw new ExecutionAuthorizationError(
          `Operator "${humanRecord.operatorId}" is NOT authorized as Master Human Authority. Self-approval / forged confirmation rejected.`
        );
      }

      // 2. Verify token TTL / freshness
      const now = Date.now();
      if (now > Date.parse(humanRecord.expiresAt)) {
        throw new ExecutionAuthorizationError(`Human confirmation token has expired at ${humanRecord.expiresAt}`);
      }

      // 3. Verify cryptographic signature integrity
      const expectedSig = computeHumanConfirmationSignature({
        confirmationId: humanRecord.confirmationId,
        bindingId: humanRecord.bindingId,
        tenantId: humanRecord.tenantId,
        sessionId: humanRecord.sessionId,
        planId: humanRecord.planId,
        planProvenanceHash: humanRecord.planProvenanceHash,
        operatorId: humanRecord.operatorId,
        token: humanRecord.token,
        confirmedAt: humanRecord.confirmedAt,
        expiresAt: humanRecord.expiresAt,
      });

      if (humanRecord.signatureHash !== expectedSig) {
        throw new ExecutionAuthorizationError('Human confirmation signature verification failed (tamper detected)');
      }

      humanSignature = humanRecord.signatureHash;
    }

    // 8. PEP Readiness Verification
    const pepReadiness = binding.pepReadiness;
    if (!pepReadiness) {
      throw new ExecutionAuthorizationError('Binding is missing PEP readiness record');
    }
    if (!pepReadiness.allPermitted) {
      throw new ExecutionAuthorizationError('PEP readiness record does not permit full plan execution');
    }

    // 9. Lease Scoping & Association
    if (lease.taskId !== task.taskId) {
      throw new ExecutionAuthorizationError(`Lease taskId "${lease.taskId}" does not match task "${task.taskId}"`);
    }
    if (lease.stepId !== targetTaskStep.stepId) {
      throw new ExecutionAuthorizationError(
        `Lease stepId "${lease.stepId}" does not match step "${targetTaskStep.stepId}"`
      );
    }
    if (lease.stepIndex !== stepIndex) {
      throw new ExecutionAuthorizationError(
        `Lease stepIndex ${lease.stepIndex} does not match request stepIndex ${stepIndex}`
      );
    }

    // 10. Construct Cryptographically Verified Authorization Envelope
    const now = new Date().toISOString();
    const authorizationId = `auth_${tenantId}_${task.taskId}_${stepIndex}_${Date.now()}`;

    const rawEnvelope = {
      authorizationId,
      tenantId,
      sessionId,
      bindingId: binding.bindingId,
      sourcePlanId: binding.sourcePlanId,
      sourcePlanProvenanceHash: binding.sourcePlanProvenanceHash,
      bindingProvenanceHash: binding.provenanceHash,
      taskId: task.taskId,
      taskProvenanceHash: task.provenanceHash,
      stepId: targetTaskStep.stepId,
      stepProvenanceHash: targetStepBinding.stepProvenanceHash,
      riskLevel: effectiveRisk,
      requiresHumanConfirmation: requiresHuman,
      humanConfirmationSignature: humanSignature,
      pdpVerdict,
      pepLeaseId: pepReadiness.preparedLeaseId ?? lease.leaseId,
      verifiedAt: now,
    };

    const authorizationHash = computeAuthorizationHash(rawEnvelope);

    return Object.freeze({
      ...rawEnvelope,
      authorizationHash,
    });
  }
}
