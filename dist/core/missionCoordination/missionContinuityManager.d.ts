import { MissionContinuitySnapshot, MissionConflict, MissionBudgetSnapshot, MissionState } from './missionCoordinationTypes.js';
export declare class MissionContinuityManager {
    private readonly missionId;
    private readonly tenantId;
    private readonly sessionId;
    private readonly snapshots;
    private lastSnapshotHash;
    constructor(missionId: string, tenantId: string, sessionId: string, initialSnapshots?: readonly MissionContinuitySnapshot[]);
    getSnapshots(): readonly MissionContinuitySnapshot[];
    getLastSnapshot(): MissionContinuitySnapshot | undefined;
    /**
     * EN: Creates and cryptographically seals a new mission continuity snapshot.
     * VI: Tạo và niêm phong mật mã một ảnh chụp nhanh tính liên tục sứ mệnh mới.
     */
    createSnapshot(params: {
        coordinationCycle: number;
        missionState: MissionState;
        completedObjectiveIds: readonly string[];
        activeObjectiveIds: readonly string[];
        pendingObjectiveIds: readonly string[];
        blockedObjectiveIds: readonly string[];
        priorityOrder: readonly string[];
        activeConflicts: readonly MissionConflict[];
        budgetState: MissionBudgetSnapshot;
        environmentFingerprint: string;
    }): MissionContinuitySnapshot;
    /**
     * EN: Verifies cryptographic hash chain integrity of the snapshot lineage.
     * VI: Xác minh tính toàn vẹn chuỗi băm mật mã của dòng dõi ảnh chụp nhanh.
     */
    verifySnapshotChain(): boolean;
    /**
     * EN: Detects environmental, authorization, or objective drift from previous snapshots.
     * VI: Phát hiện trôi dạt môi trường, ủy quyền hoặc mục tiêu từ các ảnh chụp nhanh trước.
     */
    detectDrift(currentEnvFingerprint: string, currentObjectiveIds: readonly string[], authorizedScope: readonly string[], requestedScope: readonly string[]): {
        hasDrift: boolean;
        driftType?: string;
        details?: string;
    };
    recordSnapshot(snapshot: MissionContinuitySnapshot): void;
}
