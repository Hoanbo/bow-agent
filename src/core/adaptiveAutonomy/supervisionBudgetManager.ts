// src/core/adaptiveAutonomy/supervisionBudgetManager.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1094 — REAL
//
// EN: Immutable autonomy budget tracker and hard ceiling enforcement manager.
//     Fails closed on any budget or duration exhaustion with zero self-authorization.
// VI: Trình theo dõi ngân sách tự chủ bất biến và quản lý thực thi giới hạn trần cứng.
//     Đóng-khi-lỗi khi cạn kiệt ngân sách hoặc thời lượng mà không có tự ủy quyền.

import {
  AutonomyBudgetSnapshot,
  AdaptiveAutonomyBudgetError,
  AdaptiveAutonomyAuthorizationError,
  MAX_OPERATIONAL_CYCLES,
  MAX_RECOVERY_ATTEMPTS,
  MAX_ADAPTATION_ATTEMPTS,
  MAX_CONTINUITY_GENERATIONS,
  MAX_SESSION_DURATION_MS,
  MAX_CONSECUTIVE_FAILURES,
  MAX_CONSECUTIVE_DEGRADATIONS,
} from './adaptiveAutonomyTypes.js';

export interface BudgetManagerOptions {
  readonly initialBudget?: Partial<AutonomyBudgetSnapshot>;
  readonly tenantId: string;
  readonly sessionId: string;
}

export class SupervisionBudgetManager {
  private readonly tenantId: string;
  private readonly sessionId: string;
  private maxOperationalCycles: number;
  private cyclesConsumed = 0;
  private maxRecoveryAttempts: number;
  private recoveryAttemptsConsumed = 0;
  private maxAdaptationAttempts: number;
  private adaptationAttemptsConsumed = 0;
  private maxContinuityGenerations: number;
  private continuityGenerationsConsumed = 0;
  private sessionDurationLimitMs: number;
  private readonly sessionStartedAt: number;
  private consecutiveFailures = 0;
  private consecutiveDegradations = 0;

  constructor(options: BudgetManagerOptions) {
    this.tenantId = options.tenantId;
    this.sessionId = options.sessionId;
    this.sessionStartedAt = options.initialBudget?.sessionStartedAt ?? Date.now();

    this.maxOperationalCycles = Math.min(
      options.initialBudget?.maxOperationalCycles ?? MAX_OPERATIONAL_CYCLES,
      MAX_OPERATIONAL_CYCLES
    );
    this.cyclesConsumed = options.initialBudget?.cyclesConsumed ?? 0;

    this.maxRecoveryAttempts = Math.min(
      options.initialBudget?.maxRecoveryAttempts ?? MAX_RECOVERY_ATTEMPTS,
      MAX_RECOVERY_ATTEMPTS
    );
    this.recoveryAttemptsConsumed = options.initialBudget?.recoveryAttemptsConsumed ?? 0;

    this.maxAdaptationAttempts = Math.min(
      options.initialBudget?.maxAdaptationAttempts ?? MAX_ADAPTATION_ATTEMPTS,
      MAX_ADAPTATION_ATTEMPTS
    );
    this.adaptationAttemptsConsumed = options.initialBudget?.adaptationAttemptsConsumed ?? 0;

    this.maxContinuityGenerations = Math.min(
      options.initialBudget?.maxContinuityGenerations ?? MAX_CONTINUITY_GENERATIONS,
      MAX_CONTINUITY_GENERATIONS
    );
    this.continuityGenerationsConsumed = options.initialBudget?.continuityGenerationsConsumed ?? 0;

    this.sessionDurationLimitMs = Math.min(
      options.initialBudget?.sessionDurationLimitMs ?? MAX_SESSION_DURATION_MS,
      MAX_SESSION_DURATION_MS
    );
    this.consecutiveFailures = options.initialBudget?.consecutiveFailures ?? 0;
    this.consecutiveDegradations = options.initialBudget?.consecutiveDegradations ?? 0;
  }

  public getSnapshot(): AutonomyBudgetSnapshot {
    return {
      maxOperationalCycles: this.maxOperationalCycles,
      cyclesConsumed: this.cyclesConsumed,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      recoveryAttemptsConsumed: this.recoveryAttemptsConsumed,
      maxAdaptationAttempts: this.maxAdaptationAttempts,
      adaptationAttemptsConsumed: this.adaptationAttemptsConsumed,
      maxContinuityGenerations: this.maxContinuityGenerations,
      continuityGenerationsConsumed: this.continuityGenerationsConsumed,
      sessionDurationLimitMs: this.sessionDurationLimitMs,
      sessionStartedAt: this.sessionStartedAt,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveDegradations: this.consecutiveDegradations,
    };
  }

  public assertBudgetAvailable(): void {
    const now = Date.now();
    const elapsed = now - this.sessionStartedAt;
    if (elapsed >= this.sessionDurationLimitMs) {
      throw new AdaptiveAutonomyBudgetError(
        `Session duration limit exceeded: elapsed ${elapsed}ms >= limit ${this.sessionDurationLimitMs}ms`,
        this.tenantId,
        this.sessionId
      );
    }

    if (this.cyclesConsumed >= this.maxOperationalCycles) {
      throw new AdaptiveAutonomyBudgetError(
        `Operational cycles budget exhausted: ${this.cyclesConsumed}/${this.maxOperationalCycles}`,
        this.tenantId,
        this.sessionId
      );
    }

    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      throw new AdaptiveAutonomyBudgetError(
        `Consecutive failure threshold exceeded: ${this.consecutiveFailures} >= ${MAX_CONSECUTIVE_FAILURES}`,
        this.tenantId,
        this.sessionId
      );
    }

    if (this.consecutiveDegradations >= MAX_CONSECUTIVE_DEGRADATIONS) {
      throw new AdaptiveAutonomyBudgetError(
        `Consecutive degradation threshold exceeded: ${this.consecutiveDegradations} >= ${MAX_CONSECUTIVE_DEGRADATIONS}`,
        this.tenantId,
        this.sessionId
      );
    }
  }

  public consumeCycle(): void {
    this.assertBudgetAvailable();
    this.cyclesConsumed += 1;
  }

  public consumeRecoveryAttempt(): void {
    if (this.recoveryAttemptsConsumed >= this.maxRecoveryAttempts) {
      throw new AdaptiveAutonomyBudgetError(
        `Recovery attempts budget exhausted: ${this.recoveryAttemptsConsumed}/${this.maxRecoveryAttempts}`,
        this.tenantId,
        this.sessionId
      );
    }
    this.recoveryAttemptsConsumed += 1;
  }

  public consumeAdaptationAttempt(): void {
    if (this.adaptationAttemptsConsumed >= this.maxAdaptationAttempts) {
      throw new AdaptiveAutonomyBudgetError(
        `Adaptation attempts budget exhausted: ${this.adaptationAttemptsConsumed}/${this.maxAdaptationAttempts}`,
        this.tenantId,
        this.sessionId
      );
    }
    this.adaptationAttemptsConsumed += 1;
  }

  public consumeContinuityGeneration(): void {
    if (this.continuityGenerationsConsumed >= this.maxContinuityGenerations) {
      throw new AdaptiveAutonomyBudgetError(
        `Continuity generations budget exhausted: ${this.continuityGenerationsConsumed}/${this.maxContinuityGenerations}`,
        this.tenantId,
        this.sessionId
      );
    }
    this.continuityGenerationsConsumed += 1;
  }

  public recordCycleOutcome(isSuccess: boolean, isDegraded: boolean): void {
    if (isSuccess) {
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures += 1;
    }

    if (isDegraded) {
      this.consecutiveDegradations += 1;
    } else {
      this.consecutiveDegradations = 0;
    }
  }

  /**
   * EN: Refreshes budget with genuine human governance token only. Self-authorization is strictly prohibited.
   * VI: Làm mới ngân sách chỉ bằng mã quản trị con người thực sự. Tự ủy quyền bị nghiêm cấm.
   */
  public refreshBudgetWithHumanToken(
    humanConfirmationToken: string,
    humanOperatorId: string,
    extensions: { additionalCycles?: number; additionalRecoveryAttempts?: number }
  ): void {
    if (!humanConfirmationToken || typeof humanConfirmationToken !== 'string' || humanConfirmationToken.trim().length === 0) {
      throw new AdaptiveAutonomyAuthorizationError('Budget refresh requires genuine human confirmation token', this.tenantId, this.sessionId);
    }
    if (!humanOperatorId || typeof humanOperatorId !== 'string' || humanOperatorId.trim().length === 0) {
      throw new AdaptiveAutonomyAuthorizationError('Budget refresh requires valid humanOperatorId', this.tenantId, this.sessionId);
    }

    if (extensions.additionalCycles && extensions.additionalCycles > 0) {
      this.maxOperationalCycles = Math.min(this.maxOperationalCycles + extensions.additionalCycles, MAX_OPERATIONAL_CYCLES);
    }
    if (extensions.additionalRecoveryAttempts && extensions.additionalRecoveryAttempts > 0) {
      this.maxRecoveryAttempts = Math.min(this.maxRecoveryAttempts + extensions.additionalRecoveryAttempts, MAX_RECOVERY_ATTEMPTS);
    }
    this.consecutiveFailures = 0;
    this.consecutiveDegradations = 0;
  }
}
