// src/core/policyEvolution/policyEvolutionRollbackEngine.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Governed policy evolution rollback engine.
// Executes deterministic, fail-safe restoration of verified historical policy snapshots
// upon post-rollout verification failure, safety threshold degradation, or operator revocation.
// Authority Invariant: Level 2 Controlled Execution.
// Động cơ hoàn tác tiến hóa chính sách có quản trị.
// Thực thi khôi phục xác định, an toàn lỗi các bản chụp chính sách lịch sử đã xác minh.

import {
  type PolicyRolloutRecord,
  type PolicyRollbackRecord,
  type PolicySnapshot,
  createRollbackId,
} from './policyEvolutionTypes.js';
import { PolicySnapshotStore } from './policySnapshotStore.js';

export interface ExecutePolicyRollbackInput {
  readonly rolloutRecord: PolicyRolloutRecord;
  readonly reason: string;
  readonly userId?: string;
}

export class PolicyEvolutionRollbackEngine {
  constructor(private readonly snapshotStore: PolicySnapshotStore = new PolicySnapshotStore()) {}

  /**
   * Restores the verified pre-rollout policy snapshot.
   * Restores known-good state deterministically.
   * Khôi phục bản chụp chính sách đã xác minh trước khi triển khai.
   */
  public executeRollback(input: ExecutePolicyRollbackInput): {
    readonly rollbackRecord: PolicyRollbackRecord;
    readonly restoredSnapshot: PolicySnapshot;
  } {
    const { rolloutRecord, reason, userId } = input;

    if (!rolloutRecord || !rolloutRecord.preRolloutSnapshotId) {
      throw new Error('ROLLBACK_FAILED: Valid rolloutRecord with preRolloutSnapshotId is required.');
    }

    // Rollback to pre-rollout snapshot in durable store
    const restoredSnapshot = this.snapshotStore.rollbackToSnapshot(
      rolloutRecord.preRolloutSnapshotId,
      userId
    );

    const rollbackId = createRollbackId(`rollback_${Date.now()}_${rolloutRecord.rolloutId.slice(-8)}`);

    const rollbackRecord: PolicyRollbackRecord = {
      rollbackId,
      rolloutId: rolloutRecord.rolloutId,
      revertedToVersionId: rolloutRecord.fromVersionId,
      rollbackReason: reason,
      rolledBackAt: Date.now(),
    };

    return {
      rollbackRecord: Object.freeze(rollbackRecord),
      restoredSnapshot,
    };
  }
}
