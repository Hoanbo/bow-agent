// src/core/governedRuntimeCompliance/GovernedAdaptiveSafetyController.ts
// Component 1194: GovernedAdaptiveSafetyController (REAL)
//
// Governed downward-only adaptive safety controller coordinating safety halts,
// health degradation, and incident escalation in MS-1.5.21 upon compliance breach.
// Inviolably enforces AUTOMATION != REACTIVATION: automated signals cannot unsuspend or reactivate.
// Bộ điều khiển an toàn thích ứng chỉ đi xuống có quản trị điều phối các dừng an toàn,
// suy giảm sức khỏe và leo thang sự cố trong MS-1.5.21 khi xảy ra vi phạm tuân thủ.
// Bắt buộc thực thi bất biến AUTOMATION != REACTIVATION: tín hiệu tự động không thể tự khôi phục hoặc kích hoạt lại.

import {
  SafetyControlDecision,
  OperationalAssuranceScore,
  PolicyViolationRecord,
  AutomatedReactivationForbiddenError,
  EmergencyStopActiveError,
  computeSha256,
} from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyLifecycleState } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';

export interface LifecycleStateCoordinatorBridge {
  transitionState(
    tenantId: string,
    domain: PolicyDomain,
    targetState: PolicyLifecycleState,
    triggerType: string,
    metadata?: Record<string, unknown>
  ): Promise<{ state: PolicyLifecycleState; version: number }>;
}

export interface IncidentManagerBridge {
  openIncident(
    tenantId: string,
    domain: PolicyDomain,
    type: string,
    severity: string,
    description: string,
    evidence?: Record<string, unknown>
  ): Promise<{ incidentId: string }>;
}

export interface SafetyEmergencyStopProvider {
  isEmergencyStopActive(): boolean;
}

export class GovernedAdaptiveSafetyController {
  private readonly lifecycleBridge?: LifecycleStateCoordinatorBridge;
  private readonly incidentBridge?: IncidentManagerBridge;
  private readonly stopProvider?: SafetyEmergencyStopProvider;

  constructor(
    lifecycleBridge?: LifecycleStateCoordinatorBridge,
    incidentBridge?: IncidentManagerBridge,
    stopProvider?: SafetyEmergencyStopProvider
  ) {
    this.lifecycleBridge = lifecycleBridge;
    this.incidentBridge = incidentBridge;
    this.stopProvider = stopProvider;
  }

  private assertEmergencyStopInactive(): void {
    if (!this.stopProvider) return;
    let active = true;
    try {
      const result = this.stopProvider.isEmergencyStopActive();
      if (typeof result !== 'boolean') {
        active = true;
      } else {
        active = result;
      }
    } catch (_err) {
      active = true;
    }
    if (active) {
      throw new EmergencyStopActiveError(
        'Adaptive safety control halted: EMERGENCY_STOP is currently active.'
      );
    }
  }

  // Evaluates assurance score and violations, coordinating deterministic downward safety actions.
  // Đánh giá điểm đảm bảo và vi phạm, điều phối các hành động an toàn đi xuống tiền định.
  public async evaluateSafetyIntervention(
    assurance: OperationalAssuranceScore,
    violations: readonly PolicyViolationRecord[]
  ): Promise<SafetyControlDecision> {
    this.assertEmergencyStopInactive();

    const criticalViolations = violations.filter((v) => v.severity === 'CRITICAL');
    const hasCritical = criticalViolations.length > 0 || assurance.criticalViolationPresent;
    const isBreached = assurance.state === 'ASSURED_BREACHED' || assurance.scoreValue < 0.85;
    const isDegraded = assurance.state === 'ASSURED_DEGRADED' || assurance.scoreValue < 0.95;

    let triggeredAction: 'FLAG' | 'DEGRADE' | 'SUSPEND' | 'NONE' = 'NONE';
    let reason = 'System is operating within assured compliance limits.';

    if (hasCritical || isBreached) {
      // Critical Containment: Downward Safety Halt to SUSPENDED
      // Ngăn chặn nghiêm trọng: Dừng an toàn đi xuống chuyển sang SUSPENDED
      triggeredAction = 'SUSPEND';
      reason = hasCritical
        ? `Critical safety interlock tripped: ${criticalViolations.length} critical violations detected.`
        : `Operational assurance breached: score ${assurance.scoreValue} < 0.85 threshold.`;

      // Open Incident in MS-1.5.21
      if (this.incidentBridge) {
        await this.incidentBridge.openIncident(
          assurance.tenantId,
          assurance.policyDomain,
          'INC_INTEGRITY_DRIFT',
          'SEV_1_CRITICAL',
          reason,
          {
            scoreValue: assurance.scoreValue,
            criticalViolations: criticalViolations.map((v) => v.violationId),
          }
        );
      }

      // Delegate Downward Transition to MS-1.5.21
      if (this.lifecycleBridge) {
        await this.lifecycleBridge.transitionState(
          assurance.tenantId,
          assurance.policyDomain,
          'SUSPENDED',
          'AUTOMATIC_SAFETY_INTERLOCK',
          { reason, scoreValue: assurance.scoreValue }
        );
      }
    } else if (isDegraded) {
      // Moderate Degradation: Downward Safety Warning to DEGRADED
      // Suy giảm vừa phải: Cảnh báo an toàn đi xuống chuyển sang DEGRADED
      triggeredAction = 'DEGRADE';
      reason = `Operational assurance degraded: score ${assurance.scoreValue} in warning range [0.85, 0.95).`;

      // Open Incident in MS-1.5.21
      if (this.incidentBridge) {
        await this.incidentBridge.openIncident(
          assurance.tenantId,
          assurance.policyDomain,
          'INC_HEALTH_DEGRADED',
          'SEV_2_HIGH',
          reason,
          { scoreValue: assurance.scoreValue }
        );
      }

      // Delegate Downward Transition to MS-1.5.21
      if (this.lifecycleBridge) {
        await this.lifecycleBridge.transitionState(
          assurance.tenantId,
          assurance.policyDomain,
          'DEGRADED',
          'HEALTH_DRIFT_THRESHOLD',
          { reason, scoreValue: assurance.scoreValue }
        );
      }
    }

    const decisionId = `saf_${computeSha256(`${assurance.scoreId}:${triggeredAction}:${Date.now()}`).slice(0, 16)}`;

    return Object.freeze({
      decisionId,
      tenantId: assurance.tenantId,
      policyDomain: assurance.policyDomain,
      triggeredAction,
      reason,
      assuranceScoreValue: assurance.scoreValue,
      criticalViolations: Object.freeze(criticalViolations.map((v) => v.violationId)),
      executedAt: new Date().toISOString(),
    });
  }

  // Enforces AUTOMATION != REACTIVATION invariant.
  // Thúc ép bất biến AUTOMATION != REACTIVATION: Tự động hóa không thể khôi phục kích hoạt.
  public assertNoAutomatedReactivation(
    targetState: PolicyLifecycleState,
    triggerType: string
  ): void {
    if (targetState === 'ACTIVE') {
      const FORBIDDEN_AUTO_TRIGGERS = new Set([
        'AUTOMATIC_RECOVERY',
        'HEALTH_RESTORED',
        'COMPLIANCE_RESTORED',
        'ASSURANCE_RECOVERED',
        'TIMER',
        'BACKGROUND_JOB',
        'RETRY',
      ]);
      if (FORBIDDEN_AUTO_TRIGGERS.has(triggerType.toUpperCase())) {
        throw new AutomatedReactivationForbiddenError(
          `AUTOMATION != REACTIVATION: Automated trigger '${triggerType}' cannot reactivate policy to ACTIVE. Sole Human Authority required.`
        );
      }
    }
  }
}
