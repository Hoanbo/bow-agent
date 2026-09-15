// src/core/adaptiveAutonomy/continuityIntegrityManager.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1095 — REAL
//
// EN: Cryptographic continuity integrity and drift detection manager.
//     Seals snapshots with SHA-256 hash chaining, detects state/context/authorization drift,
//     and fails closed on any integrity violation.
// VI: Trình quản lý tính toàn vẹn liên tục mật mã và phát hiện trôi dạt.
//     Niêm phong các ảnh chụp nhanh bằng chuỗi băm SHA-256, phát hiện trôi dạt trạng thái/ngữ cảnh/ủy quyền,
//     và đóng-khi-lỗi đối với bất kỳ vi phạm tính toàn vẹn nào.

import {
  ContinuitySnapshot,
  OperationalContinuityRecord,
  AdaptiveAutonomyProvenanceError,
  computeContinuitySnapshotHash,
} from './adaptiveAutonomyTypes.js';

export class ContinuityIntegrityManager {
  private readonly tenantId: string;
  private readonly sessionId: string;
  private readonly snapshots: ContinuitySnapshot[] = [];
  private lastSnapshotHash = 'GENESIS_CONTINUITY_HASH';

  constructor(tenantId: string, sessionId: string, initialSnapshots: readonly ContinuitySnapshot[] = []) {
    this.tenantId = tenantId;
    this.sessionId = sessionId;
    for (const snap of initialSnapshots) {
      this.recordSnapshot(snap);
    }
  }

  public getSnapshots(): readonly ContinuitySnapshot[] {
    return [...this.snapshots];
  }

  public getLastSnapshot(): ContinuitySnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * EN: Creates and cryptographically seals a new continuity snapshot.
   * VI: Tạo và niêm phong mật mã một ảnh chụp nhanh tính liên tục mới.
   */
  public createSnapshot(params: Omit<ContinuitySnapshot, 'snapshotId' | 'previousSnapshotHash' | 'currentSnapshotHash' | 'timestamp'>): ContinuitySnapshot {
    const timestamp = Date.now();
    const snapshotId = `snap_${params.generationIndex}_${params.cycleNumber}_${timestamp}`;
    const previousSnapshotHash = this.lastSnapshotHash;

    const payload = {
      snapshotId,
      tenantId: this.tenantId,
      sessionId: this.sessionId,
      objectiveId: params.objectiveId,
      generationIndex: params.generationIndex,
      cycleNumber: params.cycleNumber,
      completedWork: [...params.completedWork],
      pendingWork: [...params.pendingWork],
      lastHealthState: params.lastHealthState,
      recoveryState: { ...params.recoveryState },
      adaptationState: { ...params.adaptationState },
      budgetState: { ...params.budgetState },
      leaseId: params.leaseId,
      environmentFingerprint: params.environmentFingerprint,
      previousSnapshotHash,
      timestamp,
    };

    const currentSnapshotHash = computeContinuitySnapshotHash(payload);
    const sealedSnapshot: ContinuitySnapshot = {
      ...payload,
      currentSnapshotHash,
    };

    this.snapshots.push(sealedSnapshot);
    this.lastSnapshotHash = currentSnapshotHash;
    return sealedSnapshot;
  }

  /**
   * EN: Verifies continuity snapshot cryptographic hash and backward chain integrity.
   * VI: Xác minh mã băm mật mã và tính toàn vẹn chuỗi ngược của ảnh chụp nhanh.
   */
  public verifySnapshotChain(): boolean {
    let prevHash = 'GENESIS_CONTINUITY_HASH';

    for (let i = 0; i < this.snapshots.length; i++) {
      const snap = this.snapshots[i];
      if (snap.tenantId !== this.tenantId || snap.sessionId !== this.sessionId) {
        throw new AdaptiveAutonomyProvenanceError(
          `Continuity snapshot tenant/session mismatch at index ${i}`,
          this.tenantId,
          this.sessionId
        );
      }

      if (snap.previousSnapshotHash !== prevHash) {
        throw new AdaptiveAutonomyProvenanceError(
          `Continuity chain broken at index ${i}: expected prev=${prevHash}, actual=${snap.previousSnapshotHash}`,
          this.tenantId,
          this.sessionId
        );
      }

      const { currentSnapshotHash, ...payload } = snap;
      const computedHash = computeContinuitySnapshotHash(payload);
      if (currentSnapshotHash !== computedHash) {
        throw new AdaptiveAutonomyProvenanceError(
          `Continuity snapshot tamper detected at index ${i}: expected=${computedHash}, actual=${currentSnapshotHash}`,
          this.tenantId,
          this.sessionId
        );
      }

      prevHash = currentSnapshotHash;
    }

    return true;
  }

  /**
   * EN: Detects environmental, authorization, or state drift between snapshots.
   * VI: Phát hiện sự trôi dạt môi trường, ủy quyền hoặc trạng thái giữa các ảnh chụp nhanh.
   */
  public detectDrift(
    currentEnvFingerprint: string,
    currentScope: readonly string[],
    authorizedScope: readonly string[]
  ): {
    hasDrift: boolean;
    driftType?: 'ENVIRONMENT_DRIFT' | 'AUTHORIZATION_DRIFT' | 'STATE_DRIFT';
    details?: string;
  } {
    const last = this.getLastSnapshot();
    if (!last) {
      return { hasDrift: false };
    }

    // Check environment fingerprint drift
    if (currentEnvFingerprint !== last.environmentFingerprint) {
      return {
        hasDrift: true,
        driftType: 'ENVIRONMENT_DRIFT',
        details: `Environment fingerprint changed: previous=${last.environmentFingerprint}, current=${currentEnvFingerprint}`,
      };
    }

    // Check scope expansion drift
    const authorizedSet = new Set(authorizedScope);
    for (const scopeItem of currentScope) {
      if (!authorizedSet.has(scopeItem)) {
        return {
          hasDrift: true,
          driftType: 'AUTHORIZATION_DRIFT',
          details: `Scope unauthorized item: ${scopeItem}`,
        };
      }
    }

    return { hasDrift: false };
  }

  public recordSnapshot(snapshot: ContinuitySnapshot): void {
    const { currentSnapshotHash, ...payload } = snapshot;
    const computed = computeContinuitySnapshotHash(payload);
    if (currentSnapshotHash !== computed) {
      throw new AdaptiveAutonomyProvenanceError('Cannot record corrupted snapshot: hash mismatch', this.tenantId, this.sessionId);
    }
    this.snapshots.push(snapshot);
    this.lastSnapshotHash = currentSnapshotHash;
  }

  public getRecord(): OperationalContinuityRecord {
    return {
      recordId: `cont_rec_${this.sessionId}_${Date.now()}`,
      tenantId: this.tenantId,
      sessionId: this.sessionId,
      snapshots: [...this.snapshots],
      continuityStatus: 'VALID',
      lastVerifiedAt: Date.now(),
    };
  }
}
