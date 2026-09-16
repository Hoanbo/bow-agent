// src/core/governedPolicySimulation/ShadowDualEvaluationBridge.ts
// Component 1213: ShadowDualEvaluationBridge (REAL)
//
// Asynchronous, non-blocking, non-actuating shadow evaluation tap comparing active policy vs candidate shadow policy.
// Điểm rẽ nhánh đánh giá bóng không chặn, không kích hoạt, bất đồng bộ so sánh chính sách hoạt động với chính sách bóng ứng viên.

import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  EmergencyStopProvider,
  EmergencyStopActiveError,
  SimulationCrossTenantAccessForbiddenError,
  SimulationAuthorityViolationError,
  ShadowRunId,
  asShadowRunId,
  ShadowEvaluationRecord,
} from './GovernedPolicySimulationTypes.js';

export interface LiveSanitizedObservationInput {
  readonly observationId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly actionType: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly activePolicyDecision: 'ALLOW' | 'DENY';
  readonly timestamp: number;
}

export class ShadowDualEvaluationBridge {
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly shadowEvaluationHistory: ShadowEvaluationRecord[] = [];

  constructor(emergencyStopProvider?: EmergencyStopProvider) {
    this.emergencyStopProvider = emergencyStopProvider;
  }

  private assertEmergencyStopInactive(): void {
    if (!this.emergencyStopProvider) {
      throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
    }
    let active: unknown;
    try {
      active = this.emergencyStopProvider.isEmergencyStopActive();
    } catch (err) {
      throw new EmergencyStopActiveError(
        `Emergency stop provider threw error during shadow evaluation: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (typeof active !== 'boolean' || active === true) {
      throw new EmergencyStopActiveError('Emergency stop is ACTIVE or non-boolean (fail-closed)');
    }
  }

  private sanitizeTenantId(tenantId: string): string {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new SimulationCrossTenantAccessForbiddenError('Tenant ID must be a non-empty string');
    }
    const clean = tenantId.trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(clean)) {
      throw new SimulationCrossTenantAccessForbiddenError(`Invalid tenant ID format: ${clean}`);
    }
    const reservedWindows = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedWindows.test(clean) || clean.includes('..') || clean.includes('/') || clean.includes('\\')) {
      throw new SimulationCrossTenantAccessForbiddenError(`Forbidden tenant path token: ${clean}`);
    }
    return clean;
  }

  /**
   * Evaluates live observation against shadow candidate policy.
   * SHADOW_VERDICT != PDP_DECISION: Returns shadow comparison data ONLY.
   * Never interferes with, blocks, alters, or replaces live execution or live PDP decisions.
   */
  public evaluateShadowTap(
    liveObservation: LiveSanitizedObservationInput,
    candidateDeltas: readonly PolicyDelta[]
  ): ShadowEvaluationRecord {
    this.assertEmergencyStopInactive();

    if (!liveObservation || typeof liveObservation.observationId !== 'string') {
      throw new SimulationAuthorityViolationError('Invalid live observation input');
    }

    const cleanTenant = this.sanitizeTenantId(liveObservation.tenantId);
    if (!Array.isArray(candidateDeltas)) {
      throw new SimulationAuthorityViolationError('Candidate deltas must be an array');
    }

    // Determine shadow candidate decision in-memory without side-effects
    let shadowCandidateDecision: 'ALLOW' | 'DENY' = liveObservation.activePolicyDecision;

    for (const delta of candidateDeltas) {
      if (delta.fieldPath.includes(liveObservation.actionType) || delta.fieldPath.includes('rules')) {
        if (delta.proposedValue === 'DENY' || delta.proposedValue === false) {
          shadowCandidateDecision = 'DENY';
        } else if (delta.proposedValue === 'ALLOW' || delta.proposedValue === true) {
          shadowCandidateDecision = 'ALLOW';
        } else if (typeof delta.proposedValue === 'number' && typeof liveObservation.parameters.value === 'number') {
          shadowCandidateDecision = liveObservation.parameters.value <= delta.proposedValue ? 'ALLOW' : 'DENY';
        }
      }
    }

    const isDivergent = shadowCandidateDecision !== liveObservation.activePolicyDecision;
    const divergenceReason = isDivergent
      ? `Active PDP decided ${liveObservation.activePolicyDecision} but shadow candidate evaluated to ${shadowCandidateDecision}`
      : undefined;

    const record: ShadowEvaluationRecord = Object.freeze({
      shadowRunId: asShadowRunId(`shadow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
      observationId: liveObservation.observationId,
      tenantId: cleanTenant,
      policyDomain: liveObservation.policyDomain,
      activePolicyDecision: liveObservation.activePolicyDecision,
      shadowCandidateDecision,
      isDivergent,
      divergenceReason,
      evaluatedAt: Date.now(),
    });

    this.shadowEvaluationHistory.push(record);
    return record;
  }

  public getTenantShadowHistory(tenantId: string): readonly ShadowEvaluationRecord[] {
    const clean = this.sanitizeTenantId(tenantId);
    return Object.freeze(this.shadowEvaluationHistory.filter((r) => r.tenantId === clean));
  }
}
