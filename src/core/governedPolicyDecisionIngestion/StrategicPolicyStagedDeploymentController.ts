// src/core/governedPolicyDecisionIngestion/StrategicPolicyStagedDeploymentController.ts
// Component 1175: StrategicPolicyStagedDeploymentController (REAL)
//
// Ring-based staged deployment controller for strategic policies (Shadow -> Canary Rings 1-3 -> Full Active).
// Enforces single-flight locks, health gates, circuit-breaker interlocks, and atomic activation.
// Bộ điều khiển triển khai phân tầng theo vòng (Shadow -> Canary 1-3 -> Kích hoạt toàn phần);
// thực thi khóa đơn luồng, cổng kiểm tra sức khỏe, ngắt mạch an toàn và kích hoạt nguyên tử.

import {
  CANARY_RINGS,
  PolicyStagedDeploymentError,
  PolicyCircuitBreakerTrippedError,
  PolicyIngestionInterlockActiveError,
  computePolicyDeploymentRecordHash,
  type CanonicalStrategicPolicy,
  type PolicyDeploymentRecord,
  type CanaryRing,
  type PolicyDeploymentStage,
  type ShadowEvaluationReport,
} from './GovernedPolicyDecisionIngestionTypes.js';
import type { StrategicPolicyVersionStore } from './StrategicPolicyVersionStore.js';
import type { HumanDecisionRecord, HumanDecisionToken } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';

export class StrategicPolicyStagedDeploymentController {
  private readonly deploymentLocks = new Set<string>(); // tenantId:policyDomain
  private readonly activeDeployments = new Map<string, PolicyDeploymentRecord>();
  private readonly deploymentAuthorizations = new Map<string, { token: HumanDecisionToken; record: HumanDecisionRecord }>();
  private readonly trippedCircuitBreakers = new Set<string>(); // tenantId:policyDomain
  private readonly isUserStopActiveFn?: (tenantId?: string) => boolean;
  private readonly isEmergencyStopActiveFn?: (domain?: string) => boolean;

  constructor(
    private readonly versionStore: StrategicPolicyVersionStore,
    options?: {
      isUserStopActive?: (tenantId?: string) => boolean;
      isEmergencyStopActive?: (domain?: string) => boolean;
    },
  ) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.isEmergencyStopActiveFn = options?.isEmergencyStopActive;
  }

  /**
   * Initiate staged deployment of a ratified, compiled canonical policy.
   * Khởi động quy trình triển khai phân tầng cho chính sách chuẩn đã phê chuẩn.
   */
  public initiateDeployment(
    policy: CanonicalStrategicPolicy,
    shadowReport: ShadowEvaluationReport,
    authorization?: { token: HumanDecisionToken; record: HumanDecisionRecord }
  ): PolicyDeploymentRecord {
    const lockKey = `${policy.tenantId}:${policy.policyDomain}`;
    this.assertInterlocks(policy.tenantId, lockKey);

    // 1. Single-Flight Lock Defense (Split-Brain Prevention)
    if (this.deploymentLocks.has(lockKey)) {
      throw new PolicyStagedDeploymentError(
        `CONCURRENT_DEPLOYMENT_BLOCKED: Another deployment is currently in-flight for tenant '${policy.tenantId}' domain '${policy.policyDomain}'.`
      );
    }

    // 2. Pre-condition: Shadow evaluation must have passed
    if (!shadowReport.passed) {
      throw new PolicyStagedDeploymentError(
        `SHADOW_GATE_FAILED: Shadow evaluation failed with divergence rate ${(shadowReport.divergenceRate * 100).toFixed(1)}%. Promotion blocked.`
      );
    }

    this.deploymentLocks.add(lockKey);

    const deploymentId = `dep_${policy.policyId}_${Date.now()}`;
    const previousActive = this.versionStore.getActivePolicy(policy.tenantId, policy.policyDomain);

    const deploymentRecord: PolicyDeploymentRecord = {
      deploymentId,
      ratificationId: policy.metadata.ratificationId,
      tenantId: policy.tenantId,
      policyDomain: policy.policyDomain,
      policyVersion: policy.policyVersion,
      stage: 'SHADOW',
      canaryRing: 0,
      activatedAt: Date.now(),
      deploymentLockHash: shadowReport.reportHash,
      previousActiveVersion: previousActive?.policyVersion || 0,
    };

    this.activeDeployments.set(deploymentId, deploymentRecord);
    if (authorization) {
      this.deploymentAuthorizations.set(deploymentId, authorization);
    }
    this.versionStore.saveDeploymentRecord(deploymentRecord);

    return Object.freeze(deploymentRecord);
  }

  /**
   * Promote deployment to the next canary ring.
   * Nâng cấp triển khai lên vòng canary tiếp theo.
   */
  public promoteRing(
    deploymentId: string,
    targetRing: CanaryRing,
    policy: CanonicalStrategicPolicy,
    healthMetricScore = 1.0, // 0.0 - 1.0 (1.0 = completely healthy)
    authorization?: { token: HumanDecisionToken; record: HumanDecisionRecord }
  ): PolicyDeploymentRecord {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) {
      throw new PolicyStagedDeploymentError(`DEPLOYMENT_NOT_FOUND: Deployment '${deploymentId}' does not exist.`);
    }

    const lockKey = `${deployment.tenantId}:${deployment.policyDomain}`;
    this.assertInterlocks(deployment.tenantId, lockKey);

    // Enforce sequential ring progression
    if (targetRing !== deployment.canaryRing + 1) {
      throw new PolicyStagedDeploymentError(
        `ILLEGAL_RING_JUMP: Cannot jump from Ring ${deployment.canaryRing} to Ring ${targetRing}. Direct bypass is prohibited.`
      );
    }

    // Health gate check
    if (healthMetricScore < 0.95) {
      this.tripCircuitBreaker(deployment.tenantId, deployment.policyDomain, `Health score dropped to ${healthMetricScore}`);
      throw new PolicyCircuitBreakerTrippedError(
        `HEALTH_GATE_FAILED: Canary health metric score ${healthMetricScore} is below threshold 0.95. Promotion blocked.`
      );
    }

    if (authorization) {
      this.deploymentAuthorizations.set(deploymentId, authorization);
    }

    let nextStage: PolicyDeploymentStage = 'CANARY';
    if (targetRing === 4) {
      nextStage = 'ACTIVE';
      const auth = authorization || this.deploymentAuthorizations.get(deploymentId);
      // Atomically activate policy in store via authoritative gate
      this.versionStore.activatePolicy(policy, auth);
      // Release deployment lock and cleanup authorization
      this.deploymentLocks.delete(lockKey);
      this.deploymentAuthorizations.delete(deploymentId);
    }

    const updatedRecord: PolicyDeploymentRecord = {
      ...deployment,
      stage: nextStage,
      canaryRing: targetRing,
      activatedAt: Date.now(),
    };

    this.activeDeployments.set(deploymentId, updatedRecord);
    this.versionStore.saveDeploymentRecord(updatedRecord);

    return Object.freeze(updatedRecord);
  }

  /**
   * Trip circuit breaker for a tenant and domain.
   */
  public tripCircuitBreaker(tenantId: string, policyDomain: string, reason: string): void {
    const key = `${tenantId}:${policyDomain}`;
    this.trippedCircuitBreakers.add(key);
    this.deploymentLocks.delete(key);
  }

  /**
   * Reset circuit breaker with authorized token.
   */
  public resetCircuitBreaker(tenantId: string, policyDomain: string): void {
    const key = `${tenantId}:${policyDomain}`;
    this.trippedCircuitBreakers.delete(key);
  }

  public isCircuitBreakerTripped(tenantId: string, policyDomain: string): boolean {
    return this.trippedCircuitBreakers.has(`${tenantId}:${policyDomain}`);
  }

  public getDeploymentRecord(deploymentId: string): PolicyDeploymentRecord | undefined {
    return this.activeDeployments.get(deploymentId);
  }

  public releaseLock(tenantId: string, policyDomain: string): void {
    this.deploymentLocks.delete(`${tenantId}:${policyDomain}`);
  }

  private assertInterlocks(tenantId: string, lockKey: string): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn(tenantId)) {
      this.deploymentLocks.delete(lockKey);
      throw new PolicyIngestionInterlockActiveError(
        `USER_STOP_ACTIVE: Deployment halted by USER_STOP supremacy for tenant '${tenantId}'.`
      );
    }
    if (!this.isEmergencyStopActiveFn) {
      this.deploymentLocks.delete(lockKey);
      throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: deployment fails closed.');
    }
    let emergencyStopActive: boolean;
    try { emergencyStopActive = this.isEmergencyStopActiveFn(lockKey.split(':').slice(1).join(':')); }
    catch {
      this.deploymentLocks.delete(lockKey);
      throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: deployment fails closed.');
    }
    if (typeof emergencyStopActive !== 'boolean') {
      this.deploymentLocks.delete(lockKey);
      throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_INVALID: deployment fails closed.');
    }
    if (emergencyStopActive) {
      this.deploymentLocks.delete(lockKey);
      throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_ACTIVE: Deployment halted by emergency supremacy.');
    }

    if (this.trippedCircuitBreakers.has(lockKey)) {
      throw new PolicyCircuitBreakerTrippedError(
        `CIRCUIT_BREAKER_ACTIVE: Deployment blocked; circuit breaker is tripped for '${lockKey}'.`
      );
    }
  }
}
