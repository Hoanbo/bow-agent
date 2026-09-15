import { ContinuitySnapshot, OperationalContinuityRecord } from './adaptiveAutonomyTypes.js';
export declare class ContinuityIntegrityManager {
    private readonly tenantId;
    private readonly sessionId;
    private readonly snapshots;
    private lastSnapshotHash;
    constructor(tenantId: string, sessionId: string, initialSnapshots?: readonly ContinuitySnapshot[]);
    getSnapshots(): readonly ContinuitySnapshot[];
    getLastSnapshot(): ContinuitySnapshot | undefined;
    /**
     * EN: Creates and cryptographically seals a new continuity snapshot.
     * VI: Tạo và niêm phong mật mã một ảnh chụp nhanh tính liên tục mới.
     */
    createSnapshot(params: Omit<ContinuitySnapshot, 'snapshotId' | 'previousSnapshotHash' | 'currentSnapshotHash' | 'timestamp'>): ContinuitySnapshot;
    /**
     * EN: Verifies continuity snapshot cryptographic hash and backward chain integrity.
     * VI: Xác minh mã băm mật mã và tính toàn vẹn chuỗi ngược của ảnh chụp nhanh.
     */
    verifySnapshotChain(): boolean;
    /**
     * EN: Detects environmental, authorization, or state drift between snapshots.
     * VI: Phát hiện sự trôi dạt môi trường, ủy quyền hoặc trạng thái giữa các ảnh chụp nhanh.
     */
    detectDrift(currentEnvFingerprint: string, currentScope: readonly string[], authorizedScope: readonly string[]): {
        hasDrift: boolean;
        driftType?: 'ENVIRONMENT_DRIFT' | 'AUTHORIZATION_DRIFT' | 'STATE_DRIFT';
        details?: string;
    };
    recordSnapshot(snapshot: ContinuitySnapshot): void;
    getRecord(): OperationalContinuityRecord;
}
