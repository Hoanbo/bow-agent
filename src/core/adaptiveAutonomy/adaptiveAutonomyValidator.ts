// src/core/adaptiveAutonomy/adaptiveAutonomyValidator.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1089 — REAL
//
// EN: Pure fail-closed validator for adaptive autonomy sessions, authorization envelopes,
//     prototype pollution defense, CoT prohibition, and untrusted environmental prompt-injection quarantine.
// VI: Trình xác thực thuần túy đóng-khi-lỗi cho các phiên tự chủ thích ứng, phong bì ủy quyền,
//     phòng vệ ô nhiễm nguyên mẫu, cấm CoT và cách ly tiêm nhiễm nhắc lệnh môi trường không tin cậy.

import {
  AdaptiveAutonomyValidationError,
  AdaptiveAutonomyAuthorizationEnvelope,
  AdaptiveAutonomyState,
  OperationalHealthState,
  AutonomyBudgetSnapshot,
  RecoveryPolicy,
  AdaptationBoundary,
  ContinuitySnapshot,
  computeAuthorizationEnvelopeProvenanceHash,
  computeContinuitySnapshotHash,
  MAX_OPERATIONAL_CYCLES,
  MAX_RECOVERY_ATTEMPTS,
  MAX_ADAPTATION_ATTEMPTS,
  MAX_CONTINUITY_GENERATIONS,
  MAX_SESSION_DURATION_MS,
} from './adaptiveAutonomyTypes.js';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const COT_PATTERNS: readonly RegExp[] = [
  /<thought[\s\S]*?>[\s\S]*?<\/thought>/i,
  /<thought\b/i,
  /<\/thought>/i,
  /\[scratchpad\]/i,
  /\bchainOfThought\b/i,
  /\bmodelThinking\b/i,
  /\bdeliberation\b/i,
  /\bcot\b/i,
];

const PROMPT_INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+previous\s+instructions/i,
  /system\s+override/i,
  /you\s+are\s+now/i,
  /disable\s+safety/i,
  /jailbreak/i,
  /reveal\s+secret/i,
  /bypass\s+policy/i,
  /run\s+this\s+command/i,
];

const VALID_STATE_TRANSITIONS: Record<AdaptiveAutonomyState, ReadonlySet<AdaptiveAutonomyState>> = {
  INITIALIZING: new Set(['AUTHORIZED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
  AUTHORIZED: new Set(['ACTIVE', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
  ACTIVE: new Set([
    'DEGRADED',
    'RECOVERY_REQUIRED',
    'ADAPTATION_REQUIRED',
    'AWAITING_HUMAN_REVIEW',
    'SUSPENDED',
    'COMPLETED',
    'FAILED',
    'HALTED_BY_USER_STOP',
    'HALTED_BY_EMERGENCY_STOP',
    'INVALIDATED',
  ]),
  DEGRADED: new Set([
    'ACTIVE',
    'RECOVERY_REQUIRED',
    'ADAPTATION_REQUIRED',
    'AWAITING_HUMAN_REVIEW',
    'SUSPENDED',
    'FAILED',
    'HALTED_BY_USER_STOP',
    'HALTED_BY_EMERGENCY_STOP',
  ]),
  RECOVERY_REQUIRED: new Set(['RECOVERING', 'AWAITING_HUMAN_REVIEW', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP']),
  RECOVERING: new Set(['ACTIVE', 'DEGRADED', 'ADAPTATION_REQUIRED', 'AWAITING_HUMAN_REVIEW', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP']),
  ADAPTATION_REQUIRED: new Set(['ACTIVE', 'AWAITING_HUMAN_REVIEW', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP']),
  AWAITING_HUMAN_REVIEW: new Set(['RESUMABLE', 'ACTIVE', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
  SUSPENDED: new Set(['RESUMABLE', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
  RESUMABLE: new Set(['ACTIVE', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
  COMPLETED: new Set([]), // Terminal
  FAILED: new Set([]), // Terminal
  HALTED_BY_USER_STOP: new Set([]), // Terminal
  HALTED_BY_EMERGENCY_STOP: new Set([]), // Terminal
  INVALIDATED: new Set([]), // Terminal
};

export class AdaptiveAutonomyValidator {
  /**
   * EN: Recursively asserts no prototype pollution attacks are present in the payload.
   * VI: Khẳng định đệ quy không có tấn công ô nhiễm nguyên mẫu trong tải trọng.
   */
  public assertNoPrototypePollution(data: unknown, path = 'root'): void {
    if (data === null || typeof data !== 'object') {
      return;
    }

    if (Array.isArray(data)) {
      data.forEach((item, index) => this.assertNoPrototypePollution(item, `${path}[${index}]`));
      return;
    }

    for (const key of Object.getOwnPropertyNames(data)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new AdaptiveAutonomyValidationError(`Prototype pollution attempt detected at key: ${path}.${key}`);
      }
      const value = (data as Record<string, unknown>)[key];
      this.assertNoPrototypePollution(value, `${path}.${key}`);
    }
  }

  /**
   * EN: Recursively asserts no Chain-of-Thought (CoT) reasoning tokens are present.
   * VI: Khẳng định đệ quy không chứa thẻ suy luận Chain-of-Thought (CoT).
   */
  public assertNoCoT(data: unknown, path = 'root'): void {
    if (typeof data === 'string') {
      for (const pattern of COT_PATTERNS) {
        if (pattern.test(data)) {
          throw new AdaptiveAutonomyValidationError(`Forbidden Chain-of-Thought reasoning detected at ${path}: "${data.slice(0, 40)}..."`);
        }
      }
      return;
    }

    if (data === null || typeof data !== 'object') {
      return;
    }

    if (Array.isArray(data)) {
      data.forEach((item, index) => this.assertNoCoT(item, `${path}[${index}]`));
      return;
    }

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      for (const pattern of COT_PATTERNS) {
        if (pattern.test(key)) {
          throw new AdaptiveAutonomyValidationError(`Forbidden Chain-of-Thought key detected: ${path}.${key}`);
        }
      }
      this.assertNoCoT(value, `${path}.${key}`);
    }
  }

  /**
   * EN: Quarantines and sanitizes untrusted environment or prompt-injection text.
   * VI: Cách ly và khử độc văn bản môi trường không tin cậy hoặc tiêm nhiễm nhắc lệnh.
   */
  public quarantineUntrustedText(text: string): { isQuarantined: boolean; sanitizedText: string; reason?: string } {
    if (!text || typeof text !== 'string') {
      return { isQuarantined: false, sanitizedText: '' };
    }

    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          isQuarantined: true,
          sanitizedText: '[QUARANTINED_UNTRUSTED_ENVIRONMENT_DATA]',
          reason: `Detected forbidden prompt-injection pattern: ${pattern.source}`,
        };
      }
    }

    return {
      isQuarantined: false,
      sanitizedText: text,
    };
  }

  /**
   * EN: Validates authorization envelope structure, scope, risk tier, and provenance.
   * VI: Xác thực cấu trúc phong bì ủy quyền, phạm vi, mức rủi ro và nguồn gốc.
   */
  public validateAuthorizationEnvelope(envelope: AdaptiveAutonomyAuthorizationEnvelope): void {
    if (!envelope || typeof envelope !== 'object') {
      throw new AdaptiveAutonomyValidationError('Authorization envelope must be a valid non-null object');
    }

    this.assertNoPrototypePollution(envelope, 'envelope');
    this.assertNoCoT(envelope, 'envelope');

    if (!envelope.envelopeId || typeof envelope.envelopeId !== 'string') {
      throw new AdaptiveAutonomyValidationError('Missing or invalid envelopeId');
    }
    if (!envelope.tenantId || typeof envelope.tenantId !== 'string') {
      throw new AdaptiveAutonomyValidationError('Missing or invalid tenantId');
    }
    if (!envelope.sessionId || typeof envelope.sessionId !== 'string') {
      throw new AdaptiveAutonomyValidationError('Missing or invalid sessionId');
    }
    if (!envelope.humanOperatorId || typeof envelope.humanOperatorId !== 'string') {
      throw new AdaptiveAutonomyValidationError('Missing or invalid humanOperatorId');
    }
    if (!envelope.leaseId || typeof envelope.leaseId !== 'string') {
      throw new AdaptiveAutonomyValidationError('Missing or invalid leaseId');
    }
    if (!Array.isArray(envelope.authorizationScope) || envelope.authorizationScope.length === 0) {
      throw new AdaptiveAutonomyValidationError('Authorization scope must be a non-empty array of permissions');
    }

    const validRiskTiers = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    if (!validRiskTiers.has(envelope.riskTier)) {
      throw new AdaptiveAutonomyValidationError(`Invalid risk tier: ${envelope.riskTier}`);
    }

    if (envelope.riskTier === 'HIGH' || envelope.riskTier === 'CRITICAL') {
      if (!envelope.humanConfirmationToken || typeof envelope.humanConfirmationToken !== 'string') {
        throw new AdaptiveAutonomyValidationError(`High/Critical risk tier requires explicit humanConfirmationToken`);
      }
      if (!envelope.humanConfirmationExpiresAt || envelope.humanConfirmationExpiresAt <= Date.now()) {
        throw new AdaptiveAutonomyValidationError('Human confirmation token is missing expiration or has expired');
      }
    }

    if (!envelope.expiresAt || envelope.expiresAt <= Date.now()) {
      throw new AdaptiveAutonomyValidationError('Authorization envelope has expired');
    }

    // Verify cryptographic provenance hash
    const { provenanceHash, ...envelopePayload } = envelope;
    const computedHash = computeAuthorizationEnvelopeProvenanceHash(envelopePayload);
    if (provenanceHash !== computedHash) {
      throw new AdaptiveAutonomyValidationError(`Authorization envelope provenance hash mismatch: expected ${computedHash}, got ${provenanceHash}`);
    }
  }

  /**
   * EN: Validates autonomy budget limits and verifies current consumption is within bounds.
   * VI: Xác thực các giới hạn ngân sách tự chủ và kiểm tra mức tiêu thụ hiện tại nằm trong giới hạn.
   */
  public validateBudget(budget: AutonomyBudgetSnapshot): void {
    if (!budget || typeof budget !== 'object') {
      throw new AdaptiveAutonomyValidationError('Budget snapshot must be a valid non-null object');
    }

    this.assertNoPrototypePollution(budget, 'budget');

    if (budget.maxOperationalCycles <= 0 || budget.maxOperationalCycles > MAX_OPERATIONAL_CYCLES) {
      throw new AdaptiveAutonomyValidationError(`maxOperationalCycles must be in range 1..${MAX_OPERATIONAL_CYCLES}`);
    }
    if (budget.maxRecoveryAttempts <= 0 || budget.maxRecoveryAttempts > MAX_RECOVERY_ATTEMPTS) {
      throw new AdaptiveAutonomyValidationError(`maxRecoveryAttempts must be in range 1..${MAX_RECOVERY_ATTEMPTS}`);
    }
    if (budget.maxAdaptationAttempts <= 0 || budget.maxAdaptationAttempts > MAX_ADAPTATION_ATTEMPTS) {
      throw new AdaptiveAutonomyValidationError(`maxAdaptationAttempts must be in range 1..${MAX_ADAPTATION_ATTEMPTS}`);
    }
    if (budget.maxContinuityGenerations <= 0 || budget.maxContinuityGenerations > MAX_CONTINUITY_GENERATIONS) {
      throw new AdaptiveAutonomyValidationError(`maxContinuityGenerations must be in range 1..${MAX_CONTINUITY_GENERATIONS}`);
    }
    if (budget.sessionDurationLimitMs <= 0 || budget.sessionDurationLimitMs > MAX_SESSION_DURATION_MS) {
      throw new AdaptiveAutonomyValidationError(`sessionDurationLimitMs must be in range 1..${MAX_SESSION_DURATION_MS}`);
    }

    if (budget.cyclesConsumed > budget.maxOperationalCycles) {
      throw new AdaptiveAutonomyValidationError(`Cycles consumed (${budget.cyclesConsumed}) exceeds max (${budget.maxOperationalCycles})`);
    }
    if (budget.recoveryAttemptsConsumed > budget.maxRecoveryAttempts) {
      throw new AdaptiveAutonomyValidationError(`Recovery attempts consumed (${budget.recoveryAttemptsConsumed}) exceeds max (${budget.maxRecoveryAttempts})`);
    }
    if (budget.adaptationAttemptsConsumed > budget.maxAdaptationAttempts) {
      throw new AdaptiveAutonomyValidationError(`Adaptations consumed (${budget.adaptationAttemptsConsumed}) exceeds max (${budget.maxAdaptationAttempts})`);
    }
    if (budget.continuityGenerationsConsumed > budget.maxContinuityGenerations) {
      throw new AdaptiveAutonomyValidationError(`Generations consumed (${budget.continuityGenerationsConsumed}) exceeds max (${budget.maxContinuityGenerations})`);
    }
  }

  /**
   * EN: Validates recovery policy limits.
   * VI: Xác thực các giới hạn chính sách phục hồi.
   */
  public validateRecoveryPolicy(policy: RecoveryPolicy): void {
    if (!policy || typeof policy !== 'object') {
      throw new AdaptiveAutonomyValidationError('Recovery policy must be a valid non-null object');
    }
    this.assertNoPrototypePollution(policy, 'recoveryPolicy');

    if (!Array.isArray(policy.allowedFailureClasses) || policy.allowedFailureClasses.length === 0) {
      throw new AdaptiveAutonomyValidationError('allowedFailureClasses must be a non-empty array');
    }
    if (policy.maxAttemptsPerIncident <= 0 || policy.maxAttemptsPerIncident > MAX_RECOVERY_ATTEMPTS) {
      throw new AdaptiveAutonomyValidationError(`maxAttemptsPerIncident must be between 1 and ${MAX_RECOVERY_ATTEMPTS}`);
    }
  }

  /**
   * EN: Validates adaptation boundary parameters.
   * VI: Xác thực các tham số ranh giới thích ứng.
   */
  public validateAdaptationBoundary(boundary: AdaptationBoundary): void {
    if (!boundary || typeof boundary !== 'object') {
      throw new AdaptiveAutonomyValidationError('Adaptation boundary must be a valid non-null object');
    }
    this.assertNoPrototypePollution(boundary, 'adaptationBoundary');

    if (!Array.isArray(boundary.immutableAuthorizationScope) || boundary.immutableAuthorizationScope.length === 0) {
      throw new AdaptiveAutonomyValidationError('immutableAuthorizationScope must be a non-empty array');
    }
    if (boundary.allowTimeoutExpansionMaxMs < 0 || boundary.allowTimeoutExpansionMaxMs > 300_000) {
      throw new AdaptiveAutonomyValidationError('allowTimeoutExpansionMaxMs must be between 0 and 300000ms');
    }
  }

  /**
   * EN: Validates continuity snapshot and its cryptographic hash.
   * VI: Xác thực ảnh chụp tính liên tục và mã băm mật mã của nó.
   */
  public validateContinuitySnapshot(snapshot: ContinuitySnapshot): void {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new AdaptiveAutonomyValidationError('Continuity snapshot must be a valid non-null object');
    }
    this.assertNoPrototypePollution(snapshot, 'snapshot');
    this.assertNoCoT(snapshot, 'snapshot');

    const { currentSnapshotHash, ...snapshotPayload } = snapshot;
    const computed = computeContinuitySnapshotHash(snapshotPayload);
    if (currentSnapshotHash !== computed) {
      throw new AdaptiveAutonomyValidationError(`Continuity snapshot hash mismatch: expected ${computed}, got ${currentSnapshotHash}`);
    }
  }

  /**
   * EN: Asserts valid state transition according to the lifecycle state machine.
   * VI: Khẳng định chuyển đổi trạng thái hợp lệ theo máy trạng thái vòng đời.
   */
  public assertValidStateTransition(fromState: AdaptiveAutonomyState, toState: AdaptiveAutonomyState): void {
    const allowed = VALID_STATE_TRANSITIONS[fromState];
    if (!allowed || !allowed.has(toState)) {
      throw new AdaptiveAutonomyValidationError(`Illegal state transition from ${fromState} to ${toState}`);
    }
  }
}
