import { CollaborationMemoryEntry } from './federatedCollaborationMemoryTypes.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';
export interface WriteMemoryParams {
    readonly memoryId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly federationId: string;
    readonly agentId: string;
    readonly generation: number;
    readonly memoryType: string;
    readonly content: string;
    readonly confidence: number;
    readonly expiresAt: number;
}
export declare class CollaborationMemoryEngine {
    private readonly securityBoundary;
    private readonly entries;
    constructor(options?: {
        readonly securityBoundary?: CollaborationMemorySecurityBoundary;
    });
    /**
     * EN: Scrubs content for secrets, tokens, PII, and CoT deliberation markers.
     * VI: Lọc nội dung chống lại bí mật, token, PII, và các dấu hiệu suy nghĩ CoT.
     */
    sanitizeContent(content: string): void;
    /**
     * EN: Writes or updates a memory entry with synchronous security checkpoint.
     * VI: Ghi hoặc cập nhật một mục bộ nhớ với điểm kiểm tra bảo mật đồng bộ.
     */
    writeMemory(params: WriteMemoryParams): CollaborationMemoryEntry;
    /**
     * EN: Reads a memory entry by ID enforcing tenant, session, and active lease/expiration.
     * VI: Đọc một mục bộ nhớ theo mã định danh, thực thi tenant, phiên và thời hạn hết hạn.
     */
    readMemory(memoryId: string, tenantId: string, sessionId: string, federationId: string): CollaborationMemoryEntry;
    /**
     * EN: Queries active non-expired memory entries for a federation.
     * VI: Truy vấn các mục bộ nhớ hoạt động chưa hết hạn cho một liên đoàn.
     */
    queryActiveMemories(tenantId: string, sessionId: string, federationId: string): readonly CollaborationMemoryEntry[];
    /**
     * EN: Prunes expired memory entries.
     * VI: Thu gom và loại bỏ các mục bộ nhớ đã hết hạn.
     */
    pruneExpired(): number;
    /**
     * EN: Clears all memory entries (for test tear down or partition purge).
     * VI: Xóa tất cả các mục bộ nhớ (dùng cho dọn dẹp kiểm thử hoặc xóa phân vùng).
     */
    clear(): void;
}
