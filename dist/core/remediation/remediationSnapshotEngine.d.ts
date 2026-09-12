import { type GovernedRemediationPlan, type RemediationSnapshot, type RemediationSnapshotItem, type RemediationSnapshotId } from './remediationTypes.js';
export declare class RemediationSnapshotError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export interface CaptureSnapshotOptions {
    readonly plan: GovernedRemediationPlan;
    readonly baseDirectory?: string;
    readonly storageDirectory?: string;
}
export declare class RemediationSnapshotEngine {
    private readonly snapshots;
    /**
     * Captures an atomic pre-remediation state snapshot for a given remediation plan.
     * Chụp ảnh nhanh trạng thái nguyên tử trước khắc phục cho một kế hoạch khắc phục đã cho.
     */
    capturePreRemediationSnapshot(options: CaptureSnapshotOptions): RemediationSnapshot;
    /**
     * Retrieves a snapshot by ID.
     * Lấy ảnh chụp nhanh theo mã ID.
     */
    getSnapshot(snapshotId: RemediationSnapshotId): RemediationSnapshot | undefined;
    /**
     * Computes a deterministic SHA-256 hash for snapshot integrity.
     * Tính toán băm SHA-256 xác định cho tính toàn vẹn của ảnh chụp nhanh.
     */
    computeSnapshotSha256(snapshotId: RemediationSnapshotId, plan: GovernedRemediationPlan, items: readonly RemediationSnapshotItem[]): string;
}
