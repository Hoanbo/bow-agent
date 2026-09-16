// src/core/governedPolicyRemediation/PolicyBlastRadiusRiskAnalyzer.ts
// Component 1201: PolicyBlastRadiusRiskAnalyzer (REAL)
//
// Evaluates blast radius and cascading severity across dependent missions and workflows,
// strictly bounded to anonymized dependency metadata without raw cross-tenant data access.
// Đánh giá bán kính ảnh hưởng và mức độ nghiêm trọng lan truyền qua các nhiệm vụ và quy trình phụ thuộc,
// được giới hạn nghiêm ngặt ở siêu dữ liệu cấu trúc ẩn danh mà không truy cập dữ liệu thô xuyên tenant.

import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  PolicyBlastRadiusRiskRecord,
  BlastRadiusRiskLevel,
  AnonymizedDependencyTopology,
  RootCauseDiagnosisRecord,
  computeBlastRadiusHash,
  EmergencyStopProvider,
  EmergencyStopActiveError,
  CrossTenantAccessForbiddenError,
} from './GovernedPolicyRemediationTypes.js';

export interface WorkflowImpactInput {
  readonly activeWorkflowCount: number;
  readonly crossDomainRipple: boolean;
  readonly anonymizedTopology?: AnonymizedDependencyTopology;
}

export class PolicyBlastRadiusRiskAnalyzer {
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

  public evaluateBlastRadius(
    tenantId: string,
    policyDomain: PolicyDomain,
    diagnosis: RootCauseDiagnosisRecord,
    impactInput?: WorkflowImpactInput
  ): PolicyBlastRadiusRiskRecord {
    this.assertEmergencyStopInactive();

    if (!tenantId || tenantId.trim() === '') {
      throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
    }

    if (diagnosis.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Cross-tenant diagnosis record injection: expected '${tenantId}', got '${diagnosis.tenantId}'`
      );
    }

    const workflowCount = impactInput?.activeWorkflowCount ?? 1;
    const crossDomain = impactInput?.crossDomainRipple ?? false;
    const topology = impactInput?.anonymizedTopology;

    // Base score from diagnosis confidence and category severity
    let baseScore = 0.2;
    switch (diagnosis.primaryCategory) {
      case 'TENANT_DOMAIN_MISALLOCATION':
      case 'CROSS_DOMAIN_INVARIANT_CONFLICT':
        baseScore = 0.6;
        break;
      case 'ENVIRONMENTAL_PRECONDITION_COLLAPSE':
      case 'AUTHORIZATION_TOKEN_EXHAUSTION':
        baseScore = 0.5;
        break;
      case 'RULE_OVER_RESTRICTION':
      case 'PARAMETER_LIMIT_MISMATCH':
        baseScore = 0.3;
        break;
      default:
        baseScore = 0.4;
        break;
    }

    // Impact factor from active workflows
    const workflowPenalty = Math.min(0.3, (workflowCount / 10) * 0.3);

    // Cross-domain ripple factor
    const ripplePenalty = crossDomain ? 0.2 : 0.0;

    // Topology amplification if shared downstream tenants are impacted
    let topologyPenalty = 0.0;
    if (topology) {
      topologyPenalty = Math.min(0.2, (topology.downstreamTenantCount / 5) * 0.1);
    }

    const rawScore = baseScore + workflowPenalty + ripplePenalty + topologyPenalty;
    const riskScore = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 100) / 100));

    let riskLevel: BlastRadiusRiskLevel = 'LOW';
    if (riskScore >= 0.85) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 0.65) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 0.40) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    const riskAnalysisId = `risk_${tenantId}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`;

    const blastRadiusHash = computeBlastRadiusHash({
      tenantId,
      policyDomain,
      rootCauseDiagnosisId: diagnosis.diagnosisId,
      riskScore,
      riskLevel,
      impactedWorkflowsCount: workflowCount,
    });

    return Object.freeze({
      riskAnalysisId,
      tenantId,
      policyDomain,
      rootCauseDiagnosisId: diagnosis.diagnosisId,
      riskScore,
      riskLevel,
      impactedWorkflowsCount: workflowCount,
      crossDomainRippleDetected: crossDomain,
      anonymizedTopologySummary: topology ? Object.freeze({ ...topology }) : undefined,
      analysisTimestamp: new Date().toISOString(),
      blastRadiusHash,
    });
  }
}
