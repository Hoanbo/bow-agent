import { AdaptiveAutonomySession } from './adaptiveAutonomyTypes.js';
import { AdaptiveAutonomySecurityBoundary } from './adaptiveAutonomySecurityBoundary.js';
export type AdaptiveAutonomyAuditEventType = 'AUTONOMY_SESSION_INITIALIZED' | 'AUTONOMY_SESSION_ACTIVATED' | 'AUTONOMY_HEALTH_EVALUATED' | 'AUTONOMY_DEGRADED' | 'RECOVERY_REQUIRED' | 'RECOVERY_STARTED' | 'RECOVERY_SUCCEEDED' | 'RECOVERY_FAILED' | 'ADAPTATION_REQUIRED' | 'ADAPTATION_APPROVED' | 'ADAPTATION_REJECTED' | 'HUMAN_REVIEW_REQUIRED' | 'AUTONOMY_SUSPENDED' | 'AUTONOMY_RESUMED' | 'AUTONOMY_COMPLETED' | 'AUTONOMY_FAILED' | 'AUTONOMY_USER_STOP' | 'AUTONOMY_EMERGENCY_STOP' | 'AUTONOMY_BUDGET_EXHAUSTED' | 'AUTONOMY_INVALIDATED';
export interface AdaptiveAutonomyAuditRecord {
    readonly recordId: string;
    readonly eventType: AdaptiveAutonomyAuditEventType;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly timestamp: number;
    readonly payload: Record<string, unknown>;
    readonly previousHash: string;
    readonly currentHash: string;
}
export interface PersistenceOptions {
    readonly baseDirectory?: string;
    readonly securityBoundary?: AdaptiveAutonomySecurityBoundary;
}
export declare class AdaptiveAutonomyAuditPersistenceBridge {
    private readonly baseDirectory;
    private readonly securityBoundary;
    private readonly auditLog;
    private lastAuditHash;
    constructor(options?: PersistenceOptions);
    getAuditLog(): readonly AdaptiveAutonomyAuditRecord[];
    getLastAuditHash(): string;
    /**
     * EN: Emits and cryptographically chains a sanitized audit record.
     * VI: Phát ra và liên kết chuỗi mật mã một bản ghi kiểm toán đã khử độc.
     */
    emitAudit(eventType: AdaptiveAutonomyAuditEventType, tenantId: string, sessionId: string, payload: Record<string, unknown>): AdaptiveAutonomyAuditRecord;
    /**
     * EN: Verifies audit log cryptographic hash chain integrity.
     * VI: Xác minh tính toàn vẹn chuỗi băm mật mã của nhật ký kiểm toán.
     */
    verifyAuditChain(): boolean;
    getSessionDir(tenantId: string, sessionId: string): string;
    /**
     * EN: Atomically saves session document using .tmp -> verification -> .bak -> rename.
     *     Enforces strict Optimistic Concurrency Control (OCC / CAS).
     * VI: Lưu tài liệu phiên nguyên tử sử dụng .tmp -> xác minh -> .bak -> đổi tên.
     *     Thực thi Kiểm soát đồng thời lạc quan (OCC / CAS) nghiêm ngặt.
     */
    saveSession(session: AdaptiveAutonomySession): void;
    /**
     * EN: Loads session from primary file, automatically recovering from .bak if primary is corrupted.
     * VI: Tải phiên từ tệp chính, tự động phục hồi từ .bak nếu tệp chính bị hỏng.
     */
    loadSession(tenantId: string, sessionId: string): AdaptiveAutonomySession;
}
