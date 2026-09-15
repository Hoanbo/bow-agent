import { KnowledgeState, KnowledgeAuditRecord, KnowledgeAuditEventType, KnowledgeDriftCategory } from './GovernedFederatedKnowledgeStateTypes.js';
import { FederatedKnowledgeSecurityBoundary } from './FederatedKnowledgeSecurityBoundary.js';
export interface KnowledgeContinuitySnapshot {
    readonly snapshotId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly federationId: string;
    readonly stateId: string;
    readonly stateVersion: number;
    readonly entryCount: number;
    readonly generation: number;
    readonly timestamp: number;
    readonly previousSnapshotHash?: string;
    readonly snapshotHash: string;
}
export declare class KnowledgeContinuityPersistenceBridge {
    private readonly securityBoundary;
    private readonly baseStorageDir;
    private readonly auditRecords;
    private readonly snapshots;
    private lastAuditHash;
    constructor(options?: {
        readonly securityBoundary?: FederatedKnowledgeSecurityBoundary;
        readonly baseStorageDir?: string;
    });
    /**
     * EN: Emits a cryptographically hash-chained structured audit record.
     * VI: Phát ra một bản ghi kiểm toán có cấu trúc được nối chuỗi băm mật mã.
     */
    emitAudit(eventType: KnowledgeAuditEventType, tenantId: string, sessionId: string, humanOperatorId: string, missionId: string, objectiveId: string, federationId: string, generation: number, payload: Record<string, unknown>): KnowledgeAuditRecord;
    getAuditChain(): readonly KnowledgeAuditRecord[];
    /**
     * EN: Records a sealed continuity snapshot for drift detection.
     * VI: Ghi lại một ảnh chụp tính liên tục được niêm phong để phát hiện trôi dạt.
     */
    recordSnapshot(state: KnowledgeState): KnowledgeContinuitySnapshot;
    /**
     * EN: Detects drift between snapshot and current state across 10 drift categories.
     * VI: Phát hiện trôi dạt giữa ảnh chụp và trạng thái hiện tại trên 10 danh mục trôi dạt.
     */
    detectDrift(snapshot: KnowledgeContinuitySnapshot, currentState: KnowledgeState): KnowledgeDriftCategory | undefined;
    /**
     * EN: Saves state atomically with OCC validation, checksums, and backup.
     * VI: Lưu trạng thái nguyên tử với xác thực OCC, mã kiểm tra và bản sao lưu.
     */
    saveState(state: KnowledgeState, expectedVersion?: number): void;
    /**
     * EN: Recovers state from backup if canonical is corrupted.
     * VI: Khôi phục trạng thái từ bản sao lưu nếu tệp chính tắc bị hỏng.
     */
    recoverState(tenantId: string, stateId: string): KnowledgeState;
}
