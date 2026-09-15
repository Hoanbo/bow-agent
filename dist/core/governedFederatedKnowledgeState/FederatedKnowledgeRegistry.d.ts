import { GovernedKnowledgeEntry } from './GovernedFederatedKnowledgeStateTypes.js';
export interface RegisterKnowledgeEntryParams {
    readonly knowledgeId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly humanOperatorId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly federationId: string;
    readonly sourceAgentId: string;
    readonly knowledgeType: string;
    readonly content: string;
    readonly confidence: number;
    readonly evidenceIds: readonly string[];
    readonly lineageId: string;
    readonly generation: number;
    readonly expiresAt: number;
    readonly authorizationEnvelopeId: string;
    readonly leaseId?: string;
}
export declare class FederatedKnowledgeRegistry {
    private readonly entries;
    /**
     * EN: Scrubs content for prototype pollution, prompt injection, CoT deliberation, and credentials.
     * VI: Lọc sạch nội dung chống lại ô nhiễm nguyên mẫu, tiêm nhiễm prompt, suy luận CoT, và thông tin xác thực.
     */
    validateUntrustedContent(content: string): void;
    /**
     * EN: Validates objects against prototype pollution keys.
     * VI: Xác thực đối tượng chống lại các khóa ô nhiễm nguyên mẫu.
     */
    assertNoPrototypePollution(obj: Record<string, unknown>): void;
    /**
     * EN: Registers a new governed knowledge entry.
     * VI: Đăng ký một mục tri thức có quản trị mới.
     */
    registerKnowledgeEntry(params: RegisterKnowledgeEntryParams): GovernedKnowledgeEntry;
    /**
     * EN: Retrieves a knowledge entry by ID.
     * VI: Lấy một mục tri thức theo mã định danh.
     */
    getEntry(knowledgeId: string): GovernedKnowledgeEntry | undefined;
    /**
     * EN: Asserts boundary invariants between caller and knowledge entry.
     * VI: Khẳng định các bất biến ranh giới giữa bên gọi và mục tri thức.
     */
    assertEntryBoundaries(knowledgeId: string, tenantId: string, sessionId: string): GovernedKnowledgeEntry;
    /**
     * EN: Lists active non-expired entries for a federation.
     * VI: Liệt kê các mục hoạt động chưa hết hạn cho một liên đoàn.
     */
    listActiveEntries(tenantId: string, sessionId: string, federationId: string): readonly GovernedKnowledgeEntry[];
    /**
     * EN: Clears registry in-memory state.
     * VI: Xóa trạng thái trong bộ nhớ của sổ đăng ký.
     */
    clear(): void;
}
