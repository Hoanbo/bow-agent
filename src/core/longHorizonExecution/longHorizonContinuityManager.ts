// src/core/longHorizonExecution/longHorizonContinuityManager.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON CONTINUITY MANAGER
// Component 1083 — REAL
//
// EN: Enforces generation continuity, authorization freshness, and objective scope boundaries.
//     Blocks silent objective expansion, stale generation reuse, and cross-generation replay.
// VI: Thực thi tính liên tục của thế hệ, độ tươi của ủy quyền và ranh giới phạm vi mục tiêu.
//     Chặn việc âm thầm mở rộng mục tiêu, tái sử dụng thế hệ cũ và phát lại qua các thế hệ.

import {
  LongHorizonContinuityError,
  LongHorizonAuthorizationError,
  LongHorizonGenerationError,
  LongHorizonReplanningError,
  type GovernedLongHorizonObjective,
  type LongHorizonGeneration,
} from './longHorizonExecutionTypes.js';
import { LongHorizonExecutionValidator } from './longHorizonExecutionValidator.js';
import {
  type GroundedPlanTaskBinding,
  computeHumanConfirmationSignature,
} from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';

export class LongHorizonContinuityManager {
  /**
   * EN: Asserts that a new proposed plan or binding does not silently expand the objective scope.
   * VI: Khẳng định rằng kế hoạch hoặc ràng buộc đề xuất mới không âm thầm mở rộng phạm vi mục tiêu.
   */
  public assertScopeContinuity(
    objective: GovernedLongHorizonObjective,
    binding: GroundedPlanTaskBinding
  ): void {
    LongHorizonExecutionValidator.validateObjective(objective);

    // 1. Tenant & Session Isolation
    LongHorizonExecutionValidator.validateIsolation(
      objective.tenantId,
      objective.sessionId,
      binding.tenantId,
      binding.sessionId
    );

    // 2. Risk Level Ceiling
    const riskRank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const objectiveMaxRisk =
      (objective.riskPolicy as any)?.maxPermittedRiskLevel ??
      (objective.riskPolicy as any)?.maxAllowedRisk ??
      (objective.authorizationScope as any)?.maxRiskLevel ??
      'CRITICAL';
    const bindingRisk =
      (binding as any).riskLevel ??
      binding.taskSpecification?.riskLevel ??
      binding.stepBindings?.reduce((max: string, s) => {
        return (riskRank[s.riskLevel] ?? 1) > (riskRank[max] ?? 1) ? s.riskLevel : max;
      }, 'LOW') ??
      'LOW';

    if (riskRank[bindingRisk] > riskRank[objectiveMaxRisk]) {
      throw new LongHorizonContinuityError(
        `Objective scope expansion rejected: proposed binding risk "${bindingRisk}" exceeds authorized ceiling "${objectiveMaxRisk}"`
      );
    }

    // 3. Domain validation against allowed domains if specified
    const allowedDomains = (objective.authorizationScope as any)?.allowedDomains;
    if (Array.isArray(allowedDomains) && allowedDomains.length > 0) {
      for (const stepBinding of binding.stepBindings) {
        const stepDomain = (stepBinding.taskStepOptions?.parameters as any)?.targetDomain ?? 'DESKTOP';
        if (!allowedDomains.includes(stepDomain)) {
          throw new LongHorizonContinuityError(
            `Objective scope expansion rejected: step domain "${stepDomain}" not in authorized domains [${allowedDomains.join(', ')}]`
          );
        }
      }
    }
  }

  /**
   * EN: Asserts that the active generation is fresh and not superseded or aborted.
   * VI: Khẳng định rằng thế hệ đang hoạt động là mới và không bị thay thế hoặc hủy bỏ.
   */
  public assertGenerationActive(generation: LongHorizonGeneration): void {
    LongHorizonExecutionValidator.validateGeneration(generation);

    if (generation.status === 'SUPERSEDED') {
      throw new LongHorizonGenerationError(
        `Stale generation rejected: generation "${generation.generationId}" has already been SUPERSEDED`
      );
    }
    if (generation.status === 'ABORTED' || generation.status === 'INVALIDATED') {
      throw new LongHorizonGenerationError(
        `Invalid generation state: generation "${generation.generationId}" is ${generation.status}`
      );
    }
  }

  public verifyGenerationActive(generation: LongHorizonGeneration): void {
    this.assertGenerationActive(generation);
  }

  /**
   * EN: Asserts that an authorization or confirmation token is fresh and within TTL.
   * VI: Khẳng định rằng ủy quyền hoặc mã xác nhận còn mới và trong thời hạn TTL.
   */
  public assertAuthorizationFreshness(
    objective: GovernedLongHorizonObjective,
    humanTokenExpiresAt?: string
  ): void {
    const now = Date.now();

    // 1. Objective TTL check
    const objExpiresMs = Date.parse(objective.expiresAt);
    if (!Number.isNaN(objExpiresMs) && now > objExpiresMs) {
      throw new LongHorizonAuthorizationError(
        `Objective authorization has expired at ${objective.expiresAt}`
      );
    }

    // 2. Human confirmation token TTL check
    if (humanTokenExpiresAt) {
      const tokenExpiresMs = Date.parse(humanTokenExpiresAt);
      if (!Number.isNaN(tokenExpiresMs) && now > tokenExpiresMs) {
        throw new LongHorizonAuthorizationError(
          `Human confirmation token has expired at ${humanTokenExpiresAt}`
        );
      }
    }
  }

  /**
   * EN: Comprehensive authorization freshness verification for objective and binding.
   * VI: Xác minh độ tươi ủy quyền toàn diện cho mục tiêu và ràng buộc.
   */
  public verifyAuthorizationFreshness(
    objective: GovernedLongHorizonObjective,
    binding: GroundedPlanTaskBinding
  ): void {
    const now = Date.now();

    // 1. Objective TTL
    const objExpiresMs = Date.parse(objective.expiresAt);
    if (!Number.isNaN(objExpiresMs) && now > objExpiresMs) {
      throw new LongHorizonAuthorizationError(
        `Objective authorization expired at ${objective.expiresAt}`
      );
    }

    // 2. Tenant & Session Isolation
    if (objective.tenantId !== binding.tenantId) {
      throw new LongHorizonAuthorizationError(
        `Tenant mismatch in binding: objective tenant "${objective.tenantId}" vs binding tenant "${binding.tenantId}"`
      );
    }
    if (objective.sessionId !== binding.sessionId) {
      throw new LongHorizonAuthorizationError(
        `Session mismatch in binding: objective session "${objective.sessionId}" vs binding session "${binding.sessionId}"`
      );
    }

    // 3. PDP decision presence & validity
    if (!binding.pdpDecision || !binding.pdpDecision.allPermitted) {
      throw new LongHorizonAuthorizationError(
        `Binding PDP decision missing or not permitted: ${binding.pdpDecision?.allPermitted}`
      );
    }

    // 4. Risk level ceiling
    const riskRank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const maxPermittedRisk =
      (objective.riskPolicy as any)?.maxPermittedRiskLevel ??
      (objective.riskPolicy as any)?.maxAllowedRisk ??
      (objective.authorizationScope as any)?.maxRiskLevel ??
      'CRITICAL';
    const bindingRisk =
      (binding as any).riskLevel ??
      binding.taskSpecification?.riskLevel ??
      binding.stepBindings?.reduce((max: string, s) => {
        return (riskRank[s.riskLevel] ?? 1) > (riskRank[max] ?? 1) ? s.riskLevel : max;
      }, 'LOW') ??
      'LOW';

    if (riskRank[bindingRisk] > riskRank[maxPermittedRisk]) {
      throw new LongHorizonAuthorizationError(
        `Risk escalation detected: binding risk "${bindingRisk}" exceeds authorized ceiling "${maxPermittedRisk}"`
      );
    }

    // 5. Human confirmation for high risk
    const requiresHuman =
      (objective.riskPolicy as any)?.requireHumanConfirmationForHighRisk ??
      (objective.riskPolicy as any)?.requiresHumanForHighRisk ??
      binding.pdpDecision.requiresHumanApproval ??
      (bindingRisk === 'HIGH' || bindingRisk === 'CRITICAL');

    if (requiresHuman && (bindingRisk === 'HIGH' || bindingRisk === 'CRITICAL')) {
      if (!binding.humanConfirmation) {
        throw new LongHorizonAuthorizationError('Human confirmation required for HIGH/CRITICAL risk binding');
      }

      if (binding.humanConfirmation.tenantId !== objective.tenantId) {
        throw new LongHorizonAuthorizationError(
          `Human confirmation tenant mismatch: expected "${objective.tenantId}", got "${binding.humanConfirmation.tenantId}"`
        );
      }

      // Check TTL
      const hcExpiresMs = Date.parse(binding.humanConfirmation.expiresAt);
      if (!Number.isNaN(hcExpiresMs) && now > hcExpiresMs) {
        throw new LongHorizonAuthorizationError(
          `Human confirmation expired at ${binding.humanConfirmation.expiresAt}`
        );
      }

      // Check Signature
      const { signatureHash, ...rawConfirmation } = binding.humanConfirmation;
      const expectedSig = computeHumanConfirmationSignature(rawConfirmation);
      if (signatureHash !== expectedSig) {
        throw new LongHorizonAuthorizationError('Human confirmation signature verification failed (forged token)');
      }
    }
  }

  public detectObjectiveExtension(
    objective: GovernedLongHorizonObjective,
    requestedScopes: readonly string[]
  ): void {
    const authorizedScopes = Array.isArray(objective.authorizationScope)
      ? objective.authorizationScope
      : (objective.authorizationScope as any)?.allowedCapabilities ?? [];

    for (const scope of requestedScopes) {
      if (!authorizedScopes.includes(scope)) {
        throw new LongHorizonAuthorizationError(
          `Unauthorized objective extension: scope "${scope}" not in authorized scopes [${authorizedScopes.join(', ')}]`
        );
      }
    }
  }

  /**
   * EN: Asserts that a lease is strictly bound to the current generation.
   * VI: Khẳng định rằng một hợp đồng thuê được ràng buộc nghiêm ngặt với thế hệ hiện tại.
   */
  public assertLeaseGenerationBinding(
    leaseGenerationId: string,
    activeGenerationId: string
  ): void {
    if (!leaseGenerationId || !activeGenerationId || leaseGenerationId.trim() !== activeGenerationId.trim()) {
      throw new LongHorizonAuthorizationError(
        `Cross-generation lease replay rejected: lease generation "${leaseGenerationId}" does not match active generation "${activeGenerationId}"`
      );
    }
  }

  public verifyLeaseGenerationBinding(
    leaseGenerationId: string,
    activeGenerationId: string
  ): void {
    this.assertLeaseGenerationBinding(leaseGenerationId, activeGenerationId);
  }

  public detectRepeatedPlan(planHash: string, history: readonly string[]): void {
    if (history.includes(planHash)) {
      throw new LongHorizonReplanningError(
        `Oscillating / repeated replanning detected: plan hash "${planHash}" already in generation history`
      );
    }
  }
}
