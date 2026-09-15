import { CollaborationContext, CollaborationSnapshot, CollaborationAuditRecord, CollaborationAuditEventType, CollaborationDriftType } from './federatedCollaborationMemoryTypes.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';
export declare class CollaborationContinuityPersistenceBridge {
    private readonly securityBoundary;
    private readonly baseStorageDir;
    private readonly auditRecords;
    private readonly snapshots;
    private lastAuditHash;
    constructor(options?: {
        readonly securityBoundary?: CollaborationMemorySecurityBoundary;
        readonly baseStorageDir?: string;
    });
    /**
     * EN: Emits a cryptographically hash-chained structured audit event.
     * VI: Phát ra sự kiện kiểm toán có cấu trúc được nối chuỗi băm mật mã.
     */
    emitAudit(eventType: CollaborationAuditEventType, tenantId: string, sessionId: string, missionId: string, objectiveId: string, federationId: string, generation: number, payload: Record<string, unknown>, agentId?: string): CollaborationAuditRecord;
    getAuditChain(): readonly CollaborationAuditRecord[];
    /**
     * EN: Records a cryptographically sealed collaboration continuity snapshot.
     * VI: Ghi lại một ảnh chụp tính liên tục hợp tác được niêm phong mật mã.
     */
    recordSnapshot(params: {
        readonly tenantId: string;
        readonly sessionId: string;
        readonly federationId: string;
        readonly contextId: string;
        readonly contextVersion: number;
        readonly activeAgentIds: readonly string[];
        readonly memoryCount: number;
        readonly consensusCount: number;
        readonly generation: number;
    }): CollaborationSnapshot;
    /**
     * EN: Detects drift between an expected snapshot and current state.
     * VI: Phát hiện trôi dạt giữa ảnh chụp kỳ vọng và trạng thái hiện tại.
     */
    detectDrift(lastSnapshot: CollaborationSnapshot, currentContext: CollaborationContext, currentMemoryCount: number): CollaborationDriftType | undefined;
    /**
     * EN: Saves collaboration context using atomic `.tmp` -> `.bak` -> rename pattern with OCC.
     * VI: Lưu ngữ cảnh hợp tác bằng mẫu nguyên tử `.tmp` -> `.bak` -> đổi tên với OCC.
     */
    saveContext(context: CollaborationContext, expectedVersion?: number): void;
    /**
     * EN: Recovers context from backup if canonical is corrupted.
     * VI: Khôi phục ngữ cảnh từ bản sao lưu nếu tệp chính tắc bị hỏng.
     */
    recoverContext(tenantId: string, contextId: string): CollaborationContext;
}
