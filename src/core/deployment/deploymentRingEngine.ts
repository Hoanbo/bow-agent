// src/core/deployment/deploymentRingEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Deterministic rollout ring controller governing stage transitions and traffic boundaries.
// Bộ điều khiển vòng triển khai xác định quản trị các chuyển đổi giai đoạn và ranh giới lưu lượng.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - AUTOMATION != OWNER_WILL
// - RING_TRANSITION != OWNER_APPROVAL
// - CANARY_PASS != DEPLOYMENT_AUTHORIZATION
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import {
  type RolloutRingLevel,
  type RolloutRingDefinition,
  ROLLOUT_RING_ORDER,
  DeploymentError,
} from './deploymentTypes.js';

export const CANONICAL_ROLLOUT_RINGS: Record<RolloutRingLevel, RolloutRingDefinition> = {
  RING_0: {
    ringLevel: 'RING_0',
    name: 'Preflight Validation & Staging Sandbox',
    trafficPercentage: 0,
    requiresCanaryPass: false,
    minObservationDurationMs: 0,
    requiresOwnerSignoff: false,
  },
  RING_1: {
    ringLevel: 'RING_1',
    name: 'Canary Verification (Isolated Node / 5% Traffic)',
    trafficPercentage: 5,
    requiresCanaryPass: true,
    minObservationDurationMs: 30_000,
    requiresOwnerSignoff: true,
  },
  RING_2: {
    ringLevel: 'RING_2',
    name: 'Limited Rollout (25% Traffic)',
    trafficPercentage: 25,
    requiresCanaryPass: true,
    minObservationDurationMs: 60_000,
    requiresOwnerSignoff: true,
  },
  RING_3: {
    ringLevel: 'RING_3',
    name: 'Broader Rollout (50% Traffic)',
    trafficPercentage: 50,
    requiresCanaryPass: true,
    minObservationDurationMs: 120_000,
    requiresOwnerSignoff: true,
  },
  RING_4: {
    ringLevel: 'RING_4',
    name: 'Full Production Rollout (100% Traffic)',
    trafficPercentage: 100,
    requiresCanaryPass: true,
    minObservationDurationMs: 300_000,
    requiresOwnerSignoff: true,
  },
};

export interface RingTransitionRecord {
  readonly deploymentId: string;
  readonly fromRing: RolloutRingLevel;
  readonly toRing: RolloutRingLevel;
  readonly transitionedAt: number;
  readonly authorizedByTokenId: string;
  readonly canaryVerificationId?: string;
}

export class DeploymentRingEngine {
  private transitionHistory = new Map<string, RingTransitionRecord[]>();

  /**
   * Retrieves the immutable definition for a given rollout ring level.
   * Lấy định nghĩa bất biến cho một mức vòng triển khai nhất định.
   */
  public getRingDefinition(ring: RolloutRingLevel): RolloutRingDefinition {
    const def = CANONICAL_ROLLOUT_RINGS[ring];
    if (!def) {
      throw new DeploymentError('UNAUTHORIZED_RING_TRANSITION', `Unknown rollout ring level: "${ring}".`);
    }
    return { ...def };
  }

  /**
   * Computes the next sequential rollout ring in order.
   * Tính toán vòng triển khai tuần tự tiếp theo theo thứ tự.
   */
  public getNextRing(currentRing: RolloutRingLevel): RolloutRingLevel | null {
    const idx = ROLLOUT_RING_ORDER.indexOf(currentRing);
    if (idx === -1 || idx === ROLLOUT_RING_ORDER.length - 1) {
      return null;
    }
    return ROLLOUT_RING_ORDER[idx + 1];
  }

  /**
   * Evaluates if advancing from currentRing to targetRing is technically permissible.
   * Đánh giá xem việc tiến từ currentRing sang targetRing có được phép về mặt kỹ thuật hay không.
   */
  public canAdvance(options: {
    readonly currentRing: RolloutRingLevel;
    readonly targetRing: RolloutRingLevel;
    readonly isCanaryPassed: boolean;
    readonly isCircuitOpen: boolean;
    readonly isUserStopActive: boolean;
    readonly isRevoked: boolean;
  }): { readonly allowed: boolean; readonly reason?: string } {
    if (options.isUserStopActive) {
      return { allowed: false, reason: 'Advancement blocked: USER_STOP is active.' };
    }

    if (options.isRevoked) {
      return { allowed: false, reason: 'Advancement blocked: REVOCATION is active.' };
    }

    if (options.isCircuitOpen) {
      return { allowed: false, reason: 'Advancement blocked: Safety circuit breaker is OPEN.' };
    }

    const currentIdx = ROLLOUT_RING_ORDER.indexOf(options.currentRing);
    const targetIdx = ROLLOUT_RING_ORDER.indexOf(options.targetRing);

    if (targetIdx !== currentIdx + 1) {
      return {
        allowed: false,
        reason: `Advancement blocked: Non-sequential ring transition (${options.currentRing} -> ${options.targetRing}).`,
      };
    }

    const targetDef = this.getRingDefinition(options.targetRing);
    if (targetDef.requiresCanaryPass && !options.isCanaryPassed) {
      return {
        allowed: false,
        reason: `Advancement blocked: Ring "${options.targetRing}" requires a verified canary pass.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Records a deterministic ring transition.
   * Ghi nhận một quá trình chuyển đổi vòng xác định.
   */
  public recordTransition(record: RingTransitionRecord): void {
    const history = this.transitionHistory.get(record.deploymentId) ?? [];
    history.push(record);
    this.transitionHistory.set(record.deploymentId, history);
  }

  /**
   * Retrieves the full transition history for a deployment.
   * Lấy toàn bộ lịch sử chuyển đổi cho một đợt triển khai.
   */
  public getHistory(deploymentId: string): readonly RingTransitionRecord[] {
    return this.transitionHistory.get(deploymentId) ?? [];
  }
}
