import { GovernedMission } from './missionCoordinationTypes.js';
import { MissionGovernanceSecurityBoundary } from './missionGovernanceSecurityBoundary.js';
export type MissionAuditEventType = 'MISSION_CREATED' | 'MISSION_AUTHORIZED' | 'MISSION_READY' | 'MISSION_COORDINATION_STARTED' | 'OBJECTIVE_SELECTED' | 'OBJECTIVE_DELEGATED' | 'OBJECTIVE_COMPLETED' | 'OBJECTIVE_FAILED' | 'OBJECTIVE_BLOCKED' | 'PRIORITY_RECALCULATED' | 'CONFLICT_DETECTED' | 'CONFLICT_RESOLVED' | 'MISSION_REASSESSED' | 'MISSION_SUSPENDED' | 'MISSION_REVIEW_REQUIRED' | 'MISSION_RESUMED' | 'MISSION_COMPLETED' | 'MISSION_FAILED' | 'MISSION_USER_STOP' | 'MISSION_EMERGENCY_STOP' | 'MISSION_INVALIDATED' | 'MISSION_PERSISTED' | 'MISSION_RECOVERED';
export interface MissionAuditRecord {
    readonly recordId: string;
    readonly eventType: MissionAuditEventType;
    readonly tenantId: string;
    readonly missionId: string;
    readonly timestamp: number;
    readonly payload: Record<string, unknown>;
    readonly previousHash: string;
    readonly currentHash: string;
}
export interface PersistenceBridgeOptions {
    readonly baseDirectory?: string;
    readonly securityBoundary?: MissionGovernanceSecurityBoundary;
}
export declare class MissionAuditPersistenceBridge {
    private readonly baseDirectory;
    private readonly securityBoundary;
    private readonly auditLog;
    private lastAuditHash;
    constructor(options?: PersistenceBridgeOptions);
    getAuditLog(): readonly MissionAuditRecord[];
    getLastAuditHash(): string;
    /**
     * EN: Emits and cryptographically chains a sanitized mission audit record.
     * VI: Phát ra và liên kết chuỗi mật mã một bản ghi kiểm toán sứ mệnh đã khử độc.
     */
    emitAudit(eventType: MissionAuditEventType, tenantId: string, missionId: string, payload: Record<string, unknown>): MissionAuditRecord;
    /**
     * EN: Verifies audit log cryptographic hash chain integrity.
     * VI: Xác minh tính toàn vẹn chuỗi băm mật mã của nhật ký kiểm toán.
     */
    verifyAuditChain(): boolean;
    getMissionDir(tenantId: string, missionId: string): string;
    /**
     * EN: Atomically saves mission document using .tmp -> verification -> .bak -> rename.
     *     Enforces strict Optimistic Concurrency Control (OCC / CAS).
     * VI: Lưu tài liệu sứ mệnh nguyên tử sử dụng .tmp -> xác minh -> .bak -> đổi tên.
     *     Thực thi Kiểm soát đồng thời lạc quan (OCC / CAS) nghiêm ngặt.
     */
    saveMission(mission: GovernedMission): void;
    /**
     * EN: Loads mission from primary file, automatically recovering from .bak if primary is corrupt.
     * VI: Tải sứ mệnh từ tệp chính, tự động phục hồi từ .bak nếu tệp chính bị hỏng.
     */
    loadMission(tenantId: string, missionId: string): GovernedMission;
}
