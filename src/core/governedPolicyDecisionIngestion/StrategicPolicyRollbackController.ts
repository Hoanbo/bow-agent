// src/core/governedPolicyDecisionIngestion/StrategicPolicyRollbackController.ts
// Component 1176: StrategicPolicyRollbackController (REAL)
//
// Governed rollback engine restoring cryptographically verified prior policy versions.
// Enforces that rollback cannot create policy, cannot escalate authority, and cannot bypass lineage DAG.
// Động cơ rollback có kiểm soát khôi phục các phiên bản chính sách trước đó đã được xác minh;
// thực thi quy tắc rollback không được tự tạo chính sách, không leo thang quyền và không vượt ngoài đồ thị phả hệ.

import {
  PolicyRollbackError,
  computeRollbackRecordHash,
  type CanonicalStrategicPolicy,
  type PolicyRollbackRecord,
} from './GovernedPolicyDecisionIngestionTypes.js';
import type { StrategicPolicyVersionStore } from './StrategicPolicyVersionStore.js';
import type { StrategicPolicyStagedDeploymentController } from './StrategicPolicyStagedDeploymentController.js';
import type { HumanDecisionRecord, HumanDecisionToken } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { HumanDecisionTokenVerificationEngine } from './HumanDecisionTokenVerificationEngine.js';

export class StrategicPolicyRollbackController {
  private readonly rollbackRecords = new Map<string, PolicyRollbackRecord>();

  constructor(
    private readonly versionStore: StrategicPolicyVersionStore,
    private readonly deploymentController?: StrategicPolicyStagedDeploymentController,
    private readonly tokenVerifier?: HumanDecisionTokenVerificationEngine,
    private readonly isEmergencyStopActiveFn?: (domain?: string) => boolean
  ) {}

  /**
   * Execute automated or manual rollback of active policy to the verified prior version.
   * Thực hiện rollback tự động hoặc thủ công về phiên bản chính sách đã xác minh trước đó.
   */
  public executeRollback(params: {
    tenantId: string;
    policyDomain: string;
    reason: string;
    triggeredBy: 'AUTOMATIC_CIRCUIT_BREAKER' | 'AUTOMATIC_HEALTH_CHECK' | 'MANUAL_OPERATOR_REVOCATION' | 'USER_STOP' | 'EMERGENCY_STOP';
    rollbackAuthorization?: { token: HumanDecisionToken; record: HumanDecisionRecord };
  }): PolicyRollbackRecord {
    const { tenantId, policyDomain, reason, triggeredBy, rollbackAuthorization } = params;

    // Emergency stop has constitutional priority over every rollback trigger and
    // is evaluated before authorization, backup reads, lock release, or mutation.
    if (!this.isEmergencyStopActiveFn) {
      throw new PolicyRollbackError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: rollback fails closed without the authoritative stop provider.');
    }
    let emergencyStopActive: boolean;
    try { emergencyStopActive = this.isEmergencyStopActiveFn(policyDomain); }
    catch { throw new PolicyRollbackError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: stop state cannot be evaluated.'); }
    if (typeof emergencyStopActive !== 'boolean') {
      throw new PolicyRollbackError('EMERGENCY_STOP_PROVIDER_INVALID: stop provider returned an invalid state.');
    }
    if (emergencyStopActive) {
      throw new PolicyRollbackError(`EMERGENCY_STOP_ACTIVE: rollback blocked for domain '${policyDomain}'.`);
    }

    // Every rollback trigger is destructive governance mutation and therefore requires
    // cryptographic sole-human authorization; automated triggers cannot become an
    // alternate authority path.
    if (!rollbackAuthorization || !this.tokenVerifier) throw new PolicyRollbackError('UNAUTHORIZED_ROLLBACK: cryptographic Human Authority evidence is required.');

    // 2. Identify current active policy
    const currentActive = this.versionStore.getActivePolicy(tenantId, policyDomain);
    if (!currentActive) {
      throw new PolicyRollbackError(
        `NO_ACTIVE_POLICY_TO_ROLLBACK: No active policy found for tenant '${tenantId}' domain '${policyDomain}'.`
      );
    }

    // 3. Restore immediate backup snapshot from version store
    let restoredPolicy: CanonicalStrategicPolicy;
    try {
      restoredPolicy = this.versionStore.restoreFromBackup(tenantId, policyDomain, rollbackAuthorization);
    } catch (err: any) {
      throw new PolicyRollbackError(`BACKUP_RESTORATION_FAILED: ${err.message}`);
    }

    // 4. Lineage and Version Regression Assertion
    // Rollback MUST decrease version or equal parentVersion; cannot jump forward
    if (restoredPolicy.policyVersion >= currentActive.policyVersion) {
      throw new PolicyRollbackError(
        `ILLEGAL_ROLLBACK_VERSION: Restored version ${restoredPolicy.policyVersion} is not strictly less than active ${currentActive.policyVersion}.`
      );
    }

    // 5. Release any deployment locks in deployment controller
    if (this.deploymentController) {
      this.deploymentController.releaseLock(tenantId, policyDomain);
    }

    // 6. Record Rollback
    const rollbackId = `rollback_${tenantId}_v${currentActive.policyVersion}_to_v${restoredPolicy.policyVersion}_${Date.now()}`;
    const rawRecord: Omit<PolicyRollbackRecord, 'rollbackRecordHash'> = {
      rollbackId,
      tenantId,
      policyDomain: policyDomain as any,
      fromVersion: currentActive.policyVersion,
      toVersion: restoredPolicy.policyVersion,
      reason,
      triggeredBy,
      rolledBackAt: Date.now(),
      verifiedBackupHash: restoredPolicy.metadata.canonicalHash,
    };

    const rollbackRecordHash = computeRollbackRecordHash(rawRecord);
    const finalizedRecord: PolicyRollbackRecord = {
      ...rawRecord,
      rollbackRecordHash,
    };

    this.rollbackRecords.set(rollbackId, finalizedRecord);

    return Object.freeze(finalizedRecord);
  }

  public getRollbackRecord(rollbackId: string): PolicyRollbackRecord | undefined {
    return this.rollbackRecords.get(rollbackId);
  }
}
