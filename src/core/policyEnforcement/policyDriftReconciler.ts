// src/core/policyEnforcement/policyDriftReconciler.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Authoritative policy drift and cryptographic integrity reconciler.
// Periodically and on-demand compares durable disk snapshots with active in-memory state.
// Detects version discrepancies, checksum tampering, and cache staleness.
// Enforces immediate fail-closed baseline fallback upon detected divergence.
// Bộ đối soát độ lệch chính sách và tính toàn vẹn mật mã có thẩm quyền.
// So sánh định kỳ và theo yêu cầu các bản chụp đĩa bền vững với trạng thái hoạt động trong bộ nhớ.
// Phát hiện sự khác biệt về phiên bản, can thiệp mã băm và độ trễ của bộ nhớ cache.
// Thực thi dự phòng đường cơ sở đóng an toàn ngay lập tức khi phát hiện sự phân kỳ.
//
// Authority Invariants:
// - Level 0 Read-Only Drift Analysis / Level 2 Controlled Fallback Trigger
// - FAIL_CLOSED_ON_POLICY_TAMPERING
// - FAIL_CLOSED_ON_POLICY_DRIFT
// - USER_STOP > ALL_RUNTIME_POLICY_OPERATIONS

import crypto from 'node:crypto';
import { PolicySnapshotStore } from '../policyEvolution/policySnapshotStore.js';
import { PolicyHotSwapEngine, globalPolicyHotSwapEngine } from './policyHotSwapEngine.js';
import { FailClosedBaselineFallback, globalFailClosedBaselineFallback } from './failClosedBaselineFallback.js';
import {
  type PolicyDriftReport,
  createDriftReportId,
} from './policyEnforcementTypes.js';

export interface PolicyDriftReconcilerOptions {
  readonly snapshotStore?: PolicySnapshotStore;
  readonly hotSwapEngine?: PolicyHotSwapEngine;
  readonly fallbackProvider?: FailClosedBaselineFallback;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyDriftReconciler {
  private readonly snapshotStore: PolicySnapshotStore;
  private readonly hotSwapEngine: PolicyHotSwapEngine;
  private readonly fallbackProvider: FailClosedBaselineFallback;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyDriftReconcilerOptions) {
    this.snapshotStore = options?.snapshotStore ?? new PolicySnapshotStore();
    this.hotSwapEngine = options?.hotSwapEngine ?? globalPolicyHotSwapEngine;
    this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  /**
   * Reconciles the in-memory active policy against the durable snapshot for a tenant.
   * If drift, tampering, or corruption is detected, automatically triggers fail-closed baseline fallback.
   * Đối soát chính sách hoạt động trong bộ nhớ đối với bản chụp bền vững cho người thuê.
   * Nếu phát hiện độ lệch, can thiệp hoặc hỏng hóc, tự động kích hoạt dự phòng đường cơ sở đóng an toàn.
   */
  public reconcileTenantPolicy(userId: string, tenantPartition: string): PolicyDriftReport {
    const reportId = createDriftReportId(`drift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const timestamp = Date.now();

    // 1. Enforce USER_STOP supremacy
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot run drift reconciliation during emergency stop.');
    }

    // 2. Fetch in-memory active reference
    const inMemRef = this.hotSwapEngine.getActivePolicy(tenantPartition);
    const inMemConfig = inMemRef.policyConfig;

    // 3. Read authoritative durable snapshot from PolicySnapshotStore
    let durableSnapshot;
    try {
      durableSnapshot = this.snapshotStore.getActiveSnapshot(userId);
    } catch (err: any) {
      // Disk store corrupted or unreadable -> Fail closed to baseline
      this.hotSwapEngine.resetToBaseline(tenantPartition, `DURABLE_STORE_READ_FAILED: ${err?.message}`);
      return {
        reportId,
        tenantPartition,
        hasDrift: true,
        durableVersionId: 'UNAVAILABLE',
        inMemoryVersionId: inMemConfig.versionId,
        durableChecksum: 'CORRUPTED',
        inMemoryChecksum: inMemConfig.checksum,
        timestamp,
        details: `FAIL_CLOSED: Policy snapshot store unreadable. Reset to baseline. Error: ${err?.message}`,
      };
    }

    const durableConfig = durableSnapshot.configuration;

    // 4. Verify durable checksum integrity
    const calculatedDurableChecksum = this.calculateConfigChecksum(durableConfig);
    if (calculatedDurableChecksum !== durableConfig.checksum) {
      // Snapshot tampering detected on disk!
      this.hotSwapEngine.resetToBaseline(tenantPartition, 'DURABLE_CHECKSUM_TAMPER_DETECTED');
      return {
        reportId,
        tenantPartition,
        hasDrift: true,
        durableVersionId: durableConfig.versionId,
        inMemoryVersionId: inMemConfig.versionId,
        durableChecksum: durableConfig.checksum,
        inMemoryChecksum: inMemConfig.checksum,
        timestamp,
        details: `FAIL_CLOSED: Tampering detected in durable store! Recorded checksum '${durableConfig.checksum}' !== calculated '${calculatedDurableChecksum}'. Reset to baseline.`,
      };
    }

    // 5. If in-memory is currently on fallback, check if durable snapshot is valid and can be loaded
    if (inMemRef.isFallback) {
      return {
        reportId,
        tenantPartition,
        hasDrift: false,
        durableVersionId: durableConfig.versionId,
        inMemoryVersionId: inMemConfig.versionId,
        durableChecksum: durableConfig.checksum,
        inMemoryChecksum: inMemConfig.checksum,
        timestamp,
        details: 'In-memory state is operating on baseline fallback.',
      };
    }

    // 6. Compare versions and checksums between in-memory and durable
    const versionMismatch = inMemConfig.versionId !== durableConfig.versionId;
    const checksumMismatch = inMemConfig.checksum !== durableConfig.checksum;

    if (versionMismatch || checksumMismatch) {
      // Divergence detected -> reset to baseline fail-closed
      this.hotSwapEngine.resetToBaseline(
        tenantPartition,
        `POLICY_DRIFT_DETECTED: VersionMismatch=${versionMismatch}, ChecksumMismatch=${checksumMismatch}`
      );

      return {
        reportId,
        tenantPartition,
        hasDrift: true,
        durableVersionId: durableConfig.versionId,
        inMemoryVersionId: inMemConfig.versionId,
        durableChecksum: durableConfig.checksum,
        inMemoryChecksum: inMemConfig.checksum,
        timestamp,
        details: `FAIL_CLOSED: In-memory active policy diverged from durable snapshot. Memory Version: '${inMemConfig.versionId}', Disk Version: '${durableConfig.versionId}'. Reset to baseline.`,
      };
    }

    // 7. Verify in-memory classifications preserve hard-forbidden safety floor
    if (!this.fallbackProvider.verifyClassificationSafetyFloor(inMemConfig.actionClassifications)) {
      this.hotSwapEngine.resetToBaseline(tenantPartition, 'ILLEGAL_FORBIDDEN_DOWNGRADE_IN_MEMORY');
      return {
        reportId,
        tenantPartition,
        hasDrift: true,
        durableVersionId: durableConfig.versionId,
        inMemoryVersionId: inMemConfig.versionId,
        durableChecksum: durableConfig.checksum,
        inMemoryChecksum: inMemConfig.checksum,
        timestamp,
        details: 'FAIL_CLOSED: In-memory action classifications violate hard-forbidden safety floor. Reset to baseline.',
      };
    }

    // Nominal state — No drift
    return {
      reportId,
      tenantPartition,
      hasDrift: false,
      durableVersionId: durableConfig.versionId,
      inMemoryVersionId: inMemConfig.versionId,
      durableChecksum: durableConfig.checksum,
      inMemoryChecksum: inMemConfig.checksum,
      timestamp,
      details: 'Nominal synchronization: In-memory policy matches authoritative durable snapshot.',
    };
  }

  /**
   * Helper calculating deterministic SHA-256 checksum for a policy configuration.
   * Hàm trợ giúp tính toán mã kiểm tra SHA-256 tất định cho một cấu hình chính sách.
   */
  private calculateConfigChecksum(config: any): string {
    const payload = JSON.stringify({
      versionId: config.versionId,
      classifications: config.actionClassifications,
      guardrails: config.guardrails,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}

export const globalPolicyDriftReconciler = new PolicyDriftReconciler();
