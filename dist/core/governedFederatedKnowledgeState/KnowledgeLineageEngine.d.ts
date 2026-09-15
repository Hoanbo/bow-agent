import { KnowledgeLineageRecord } from './GovernedFederatedKnowledgeStateTypes.js';
export interface CreateLineageParams {
    readonly lineageId: string;
    readonly targetKnowledgeId: string;
    readonly parentLineageIds: readonly string[];
    readonly sourceIds: readonly string[];
    readonly sourceTypes: readonly string[];
    readonly sourceGenerations: readonly number[];
    readonly sourceAgentIds: readonly string[];
    readonly derivationType: 'DIRECT' | 'AGGREGATED' | 'RECONCILED' | 'CONSENSUS_DERIVED';
}
export declare class KnowledgeLineageEngine {
    private readonly lineages;
    /**
     * EN: Registers a new immutable lineage record.
     * VI: Đăng ký một bản ghi huyết thống bất biến mới.
     */
    recordLineage(params: CreateLineageParams): KnowledgeLineageRecord;
    /**
     * EN: Verifies cryptographic provenance integrity of a lineage chain.
     * VI: Xác minh tính toàn vẹn nguồn gốc mật mã của một chuỗi huyết thống.
     */
    verifyLineageIntegrity(lineageId: string): boolean;
    /**
     * EN: Retrieves lineage record by ID.
     * VI: Lấy bản ghi huyết thống theo mã định danh.
     */
    getLineage(lineageId: string): KnowledgeLineageRecord | undefined;
    /**
     * EN: Clears state.
     * VI: Xóa trạng thái.
     */
    clear(): void;
}
