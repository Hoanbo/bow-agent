import { GovernedFederationGroup, FederationContinuitySnapshot } from './multiAgentFederationTypes.js';
import { FederationSecurityBoundary } from './federationSecurityBoundary.js';
export type FederationAuditEventType = 'AGENT_REGISTERED' | 'AGENT_AUTHORIZATION_VERIFIED' | 'AGENT_CAPABILITY_BOUND' | 'AGENT_SUSPENDED' | 'AGENT_REVOKED' | 'FEDERATION_CREATED' | 'FEDERATION_AUTHORIZED' | 'FEDERATION_READY' | 'AGENT_JOINED_FEDERATION' | 'AGENT_LEFT_FEDERATION' | 'LEADER_ASSIGNED' | 'DELEGATION_CREATED' | 'DELEGATION_AUTHORIZED' | 'DELEGATION_REJECTED' | 'DELEGATION_COMPLETED' | 'DELEGATION_FAILED' | 'DELEGATION_BLOCKED' | 'DELEGATION_CONFLICT_DETECTED' | 'DELEGATION_CONFLICT_RESOLVED' | 'TRUST_RECALCULATED' | 'FEDERATION_REASSESSED' | 'FEDERATION_SUSPENDED' | 'FEDERATION_REVIEW_REQUIRED' | 'FEDERATION_RESUMED' | 'FEDERATION_USER_STOP' | 'FEDERATION_EMERGENCY_STOP' | 'FEDERATION_INVALIDATED' | 'FEDERATION_PERSISTED' | 'FEDERATION_RECOVERED';
export interface FederationAuditRecord {
    readonly recordId: string;
    readonly eventType: FederationAuditEventType;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly federationId?: string;
    readonly agentId?: string;
    readonly delegationId?: string;
    readonly generation: number;
    readonly timestamp: number;
    readonly payload: Record<string, unknown>;
    readonly previousHash: string;
    readonly currentHash: string;
}
export declare class FederationContinuityPersistenceBridge {
    private readonly baseDirectory;
    private readonly securityBoundary;
    private readonly auditLog;
    private readonly snapshots;
    private lastAuditHash;
    private lastSnapshotHash;
    constructor(options?: {
        readonly baseDirectory?: string;
        readonly securityBoundary?: FederationSecurityBoundary;
    });
    getAuditLog(): readonly FederationAuditRecord[];
    getLastAuditHash(): string;
    getSnapshots(): readonly FederationContinuitySnapshot[];
    getLastSnapshotHash(): string;
    /**
     * EN: Emits and cryptographically chains a sanitized federation audit record.
     * VI: Phát ra và liên kết chuỗi mật mã một bản ghi kiểm toán liên đoàn đã khử độc.
     */
    emitAudit(eventType: FederationAuditEventType, tenantId: string, sessionId: string, generation: number, payload: Record<string, unknown>, ids?: {
        federationId?: string;
        agentId?: string;
        delegationId?: string;
    }): FederationAuditRecord;
    /**
     * EN: Seals and records a federation continuity snapshot with drift detection.
     * VI: Niêm phong và ghi lại ảnh chụp liên tục của liên đoàn với tính năng phát hiện trôi dạt.
     */
    recordSnapshot(params: Omit<FederationContinuitySnapshot, 'currentSnapshotHash' | 'previousSnapshotHash' | 'snapshotId' | 'timestamp'>): FederationContinuitySnapshot;
    /**
     * EN: Persists a federation group crash-safely using atomic write (.tmp -> checksum -> .bak -> rename).
     * VI: Lưu trữ một nhóm liên đoàn an toàn khi sự cố bằng cách ghi nguyên tử (.tmp -> checksum -> .bak -> rename).
     */
    saveFederation(federation: GovernedFederationGroup, expectedVersion?: number): void;
    /**
     * EN: Loads a federation group with automatic corruption detection and backup recovery.
     * VI: Tải một nhóm liên đoàn với tính năng tự động phát hiện hư hỏng và phục hồi sao lưu.
     */
    loadFederation(tenantId: string, federationId: string): GovernedFederationGroup | null;
    private recoverFromBackup;
}
