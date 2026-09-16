// src/core/governedPolicyRemediation/GovernedRemediationStrategySynthesizer.ts
// Component 1202: GovernedRemediationStrategySynthesizer (REAL)
//
// Synthesizes non-authoritative candidate remediation action plans (delta amendments, parameter clamps,
// rollback recommendations, quarantine advisories); strictly enforces REMEDIATION != MUTATION.
// Tổng hợp các kế hoạch hành động khắc phục ứng viên không có thẩm quyền (sửa đổi delta, kẹp tham số,
// khuyến nghị rollback, khuyến cáo cách ly); thực thi nghiêm ngặt REMEDIATION != MUTATION.

import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  RemediationCandidate,
  RemediationActionType,
  RootCauseDiagnosisRecord,
  PolicyBlastRadiusRiskRecord,
  asRemediationId,
  computeCandidateRemediationHash,
  EmergencyStopProvider,
  EmergencyStopActiveError,
  CrossTenantAccessForbiddenError,
  RemediationAuthorityViolationError,
} from './GovernedPolicyRemediationTypes.js';

export interface SynthesisContext {
  readonly diagnosis: RootCauseDiagnosisRecord;
  readonly blastRadius: PolicyBlastRadiusRiskRecord;
  readonly incidentEvidenceHash: string;
  readonly activePolicyHash: string;
  readonly activePolicyVersion?: number;
}

export class GovernedRemediationStrategySynthesizer {
  private readonly emergencyStopProvider?: EmergencyStopProvider;

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
    } catch (err: unknown) {
      throw new EmergencyStopActiveError(`Emergency stop provider threw error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (typeof active !== 'boolean') {
      throw new EmergencyStopActiveError('Emergency stop provider returned non-boolean value (fail-closed)');
    }
    if (active === true) {
      throw new EmergencyStopActiveError('Emergency stop is currently ACTIVE (fail-closed)');
    }
  }

  public synthesizeRemediationCandidate(
    tenantId: string,
    policyDomain: PolicyDomain,
    context: SynthesisContext
  ): RemediationCandidate {
    this.assertEmergencyStopInactive();

    if (!tenantId || tenantId.trim() === '') {
      throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
    }

    if (context.diagnosis.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Cross-tenant diagnosis record mismatch: expected '${tenantId}', got '${context.diagnosis.tenantId}'`
      );
    }
    if (context.blastRadius.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Cross-tenant blast radius record mismatch: expected '${tenantId}', got '${context.blastRadius.tenantId}'`
      );
    }

    let proposedAction: RemediationActionType = 'AMEND_POLICY_RULE';
    let candidateDelta: Record<string, unknown> = {};
    let targetRuleId = context.diagnosis.diagnosedRuleId;
    let targetParameterKey = context.diagnosis.diagnosedParameter;
    let clampedLimitValue: number | string | undefined;
    let recommendedPredecessorVersion: number | undefined;
    let justification = '';

    // Deterministic selection of proposed remediation based on diagnosed root cause category
    switch (context.diagnosis.primaryCategory) {
      case 'PARAMETER_LIMIT_MISMATCH':
        proposedAction = 'CLAMP_PARAMETER_LIMIT';
        targetParameterKey = targetParameterKey ?? 'concurrencyLimit';
        clampedLimitValue = 5;
        candidateDelta = {
          op: 'CLAMP_CONSTRAINT',
          ruleId: targetRuleId ?? 'rule_general_limit',
          parameter: targetParameterKey,
          clampedValue: clampedLimitValue,
        };
        justification = `Diagnosed parameter limit mismatch. Propose clamping '${targetParameterKey}' to ${clampedLimitValue} to restore stability.`;
        break;

      case 'RULE_OVER_RESTRICTION':
        proposedAction = 'AMEND_POLICY_RULE';
        candidateDelta = {
          op: 'RELAX_CONSTRAINT',
          ruleId: targetRuleId ?? 'rule_scope_constraint',
          rationale: 'Overly restrictive pattern blocked legitimate operation',
        };
        justification = `Diagnosed rule over-restriction at rule '${targetRuleId}'. Propose relaxing pattern constraint.`;
        break;

      case 'BEHAVIORAL_DRIFT_CASCADE':
      case 'CROSS_DOMAIN_INVARIANT_CONFLICT':
        if (context.blastRadius.riskLevel === 'CRITICAL' || context.blastRadius.riskLevel === 'HIGH') {
          // Critical systemic risk: recommend rolling back to verified previous version
          proposedAction = 'ROLLBACK_POLICY_VERSION';
          recommendedPredecessorVersion = Math.max(1, (context.activePolicyVersion ?? 2) - 1);
          candidateDelta = {
            op: 'RECOMMEND_ROLLBACK',
            targetVersion: recommendedPredecessorVersion,
            rationale: 'Cascading drift or cross-domain conflict requires reverting to stable predecessor snapshot',
          };
          justification = `Critical systemic risk (${context.blastRadius.riskLevel}). Recommend initiating human-governed rollback to version ${recommendedPredecessorVersion}.`;
        } else {
          proposedAction = 'QUARANTINE_ACTION';
          candidateDelta = {
            op: 'QUARANTINE_ACTION',
            ruleId: targetRuleId,
            quarantineCooldownSeconds: 300,
          };
          justification = `Moderate risk drift detected. Recommend temporary operational quarantine for action under '${targetRuleId}'.`;
        }
        break;

      case 'ENVIRONMENTAL_PRECONDITION_COLLAPSE':
      case 'TEMPORAL_CLOCK_DESYNCHRONIZATION':
        proposedAction = 'QUARANTINE_ACTION';
        candidateDelta = {
          op: 'QUARANTINE_ACTION',
          quarantineCooldownSeconds: 600,
          environmentalAdvisory: 'Host or clock infrastructure requires external resolution',
        };
        justification = `Precondition collapse (${context.diagnosis.primaryCategory}). Quarantine dependent operations without executing OS commands.`;
        break;

      case 'AUTHORIZATION_TOKEN_EXHAUSTION':
      case 'TENANT_DOMAIN_MISALLOCATION':
      case 'UNKNOWN_ANOMALOUS_MUTATION':
      default:
        proposedAction = 'AMEND_POLICY_RULE';
        candidateDelta = {
          op: 'FLAG_FOR_OPERATOR_REVIEW',
          category: context.diagnosis.primaryCategory,
        };
        justification = `Anomaly or tenant misallocation detected. Advisory package compiled for Sole Human Authority deliberation.`;
        break;
    }

    const remediationId = asRemediationId(`rem_${tenantId}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString(); // 24-hour TTL

    const candidateHash = computeCandidateRemediationHash({
      tenantId,
      policyDomain,
      incidentEvidenceHash: context.incidentEvidenceHash,
      diagnosisHash: context.diagnosis.diagnosisHash,
      blastRadiusHash: context.blastRadius.blastRadiusHash,
      activePolicyHash: context.activePolicyHash,
      proposedAction,
      candidatePolicyDelta: candidateDelta,
      lifecycleState: 'REVIEW_PENDING',
    });

    return Object.freeze({
      remediationId,
      tenantId,
      policyDomain,
      incidentEvidenceHash: context.incidentEvidenceHash,
      diagnosisHash: context.diagnosis.diagnosisHash,
      blastRadiusHash: context.blastRadius.blastRadiusHash,
      activePolicyHash: context.activePolicyHash,
      proposedAction,
      candidatePolicyDelta: Object.freeze(candidateDelta),
      targetRuleId,
      recommendedPredecessorVersion,
      targetParameterKey,
      clampedLimitValue,
      justification,
      lifecycleState: 'REVIEW_PENDING',
      candidateHash,
      createdAt,
      expiresAt,
    });
  }
}
