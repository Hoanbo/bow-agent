// src/core/missionCoordination/missionContinuityManager.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1104 — REAL
//
// EN: Cryptographic mission continuity manager and multi-objective drift detector.
//     Seals mission snapshots with SHA-256 hash chaining and detects context/objective/lease drift.
// VI: Trình quản lý tính liên tục sứ mệnh mật mã và phát hiện trôi dạt đa mục tiêu.
//     Niêm phong ảnh chụp sứ mệnh bằng chuỗi băm SHA-256 và phát hiện trôi dạt ngữ cảnh/mục tiêu/hợp đồng thuê.
import { MissionCoordinationProvenanceError, computeMissionSnapshotHash, } from './missionCoordinationTypes.js';
export class MissionContinuityManager {
    missionId;
    tenantId;
    sessionId;
    snapshots = [];
    lastSnapshotHash = 'GENESIS_MISSION_SNAPSHOT_HASH';
    constructor(missionId, tenantId, sessionId, initialSnapshots = []) {
        this.missionId = missionId;
        this.tenantId = tenantId;
        this.sessionId = sessionId;
        for (const snap of initialSnapshots) {
            this.recordSnapshot(snap);
        }
    }
    getSnapshots() {
        return [...this.snapshots];
    }
    getLastSnapshot() {
        return this.snapshots[this.snapshots.length - 1];
    }
    /**
     * EN: Creates and cryptographically seals a new mission continuity snapshot.
     * VI: Tạo và niêm phong mật mã một ảnh chụp nhanh tính liên tục sứ mệnh mới.
     */
    createSnapshot(params) {
        const timestamp = Date.now();
        const snapshotId = `msnap_${this.missionId}_${params.coordinationCycle}_${timestamp}`;
        const previousSnapshotHash = this.lastSnapshotHash;
        const payload = {
            snapshotId,
            missionId: this.missionId,
            tenantId: this.tenantId,
            sessionId: this.sessionId,
            coordinationCycle: params.coordinationCycle,
            missionState: params.missionState,
            completedObjectiveIds: [...params.completedObjectiveIds],
            activeObjectiveIds: [...params.activeObjectiveIds],
            pendingObjectiveIds: [...params.pendingObjectiveIds],
            blockedObjectiveIds: [...params.blockedObjectiveIds],
            priorityOrder: [...params.priorityOrder],
            activeConflicts: [...params.activeConflicts],
            budgetState: { ...params.budgetState },
            environmentFingerprint: params.environmentFingerprint,
            previousSnapshotHash,
            timestamp,
        };
        const currentSnapshotHash = computeMissionSnapshotHash(payload);
        const sealedSnapshot = {
            ...payload,
            currentSnapshotHash,
        };
        this.snapshots.push(sealedSnapshot);
        this.lastSnapshotHash = currentSnapshotHash;
        return sealedSnapshot;
    }
    /**
     * EN: Verifies cryptographic hash chain integrity of the snapshot lineage.
     * VI: Xác minh tính toàn vẹn chuỗi băm mật mã của dòng dõi ảnh chụp nhanh.
     */
    verifySnapshotChain() {
        let prev = 'GENESIS_MISSION_SNAPSHOT_HASH';
        for (let i = 0; i < this.snapshots.length; i++) {
            const snap = this.snapshots[i];
            if (snap.missionId !== this.missionId || snap.tenantId !== this.tenantId || snap.sessionId !== this.sessionId) {
                throw new MissionCoordinationProvenanceError(`Snapshot mission/tenant/session mismatch at index ${i}`, this.tenantId, this.missionId);
            }
            if (snap.previousSnapshotHash !== prev) {
                throw new MissionCoordinationProvenanceError(`Snapshot chain broken at index ${i}: expected prev=${prev}, got=${snap.previousSnapshotHash}`, this.tenantId, this.missionId);
            }
            const { currentSnapshotHash, ...payload } = snap;
            const computed = computeMissionSnapshotHash(payload);
            if (currentSnapshotHash !== computed) {
                throw new MissionCoordinationProvenanceError(`Snapshot hash tampering detected at index ${i}: expected=${computed}, got=${currentSnapshotHash}`, this.tenantId, this.missionId);
            }
            prev = currentSnapshotHash;
        }
        return true;
    }
    /**
     * EN: Detects environmental, authorization, or objective drift from previous snapshots.
     * VI: Phát hiện trôi dạt môi trường, ủy quyền hoặc mục tiêu từ các ảnh chụp nhanh trước.
     */
    detectDrift(currentEnvFingerprint, currentObjectiveIds, authorizedScope, requestedScope) {
        const last = this.getLastSnapshot();
        if (!last) {
            return { hasDrift: false };
        }
        // 1. Environment drift
        if (currentEnvFingerprint !== last.environmentFingerprint) {
            return {
                hasDrift: true,
                driftType: 'ENVIRONMENT_DRIFT',
                details: `Environment fingerprint changed: previous=${last.environmentFingerprint}, current=${currentEnvFingerprint}`,
            };
        }
        // 2. Scope expansion drift
        const authSet = new Set(authorizedScope);
        for (const s of requestedScope) {
            if (!authSet.has(s)) {
                return {
                    hasDrift: true,
                    driftType: 'AUTHORIZATION_DRIFT',
                    details: `Requested scope item '${s}' exceeds authorized boundary`,
                };
            }
        }
        // 3. Objective tampering drift
        const prevAllObjectives = new Set([
            ...last.completedObjectiveIds,
            ...last.activeObjectiveIds,
            ...last.pendingObjectiveIds,
            ...last.blockedObjectiveIds,
        ]);
        for (const objId of currentObjectiveIds) {
            if (!prevAllObjectives.has(objId)) {
                return {
                    hasDrift: true,
                    driftType: 'OBJECTIVE_DRIFT',
                    details: `Unregistered objective '${objId}' injected into mission execution`,
                };
            }
        }
        return { hasDrift: false };
    }
    recordSnapshot(snapshot) {
        const { currentSnapshotHash, ...payload } = snapshot;
        const computed = computeMissionSnapshotHash(payload);
        if (currentSnapshotHash !== computed) {
            throw new MissionCoordinationProvenanceError('Cannot record corrupted snapshot: hash mismatch', this.tenantId, this.missionId);
        }
        this.snapshots.push(snapshot);
        this.lastSnapshotHash = currentSnapshotHash;
    }
}
