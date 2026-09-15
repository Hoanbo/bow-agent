import { KnowledgeState, GovernedKnowledgeEntry, KnowledgeMergeResult, KnowledgeReconciliationResult } from './GovernedFederatedKnowledgeStateTypes.js';
import { FederatedKnowledgeSecurityBoundary } from './FederatedKnowledgeSecurityBoundary.js';
export declare class KnowledgeMergeReconciliationEngine {
    private readonly securityBoundary;
    private readonly mergeResults;
    private readonly reconciliationResults;
    constructor(options?: {
        readonly securityBoundary?: FederatedKnowledgeSecurityBoundary;
    });
    /**
     * EN: Merges entries from a source state into a target state following strict governance rules.
     * VI: Hợp nhất các mục từ trạng thái nguồn vào trạng thái đích tuân thủ quy tắc quản trị nghiêm ngặt.
     */
    mergeStates(mergeId: string, targetState: KnowledgeState, sourceState: KnowledgeState): {
        updatedTargetState: KnowledgeState;
        mergeResult: KnowledgeMergeResult;
    };
    /**
     * EN: Reconciles contradictory entries and produces a governed reconciliation record.
     * VI: Đối soát các mục mâu thuẫn và tạo ra một bản ghi đối soát có quản trị.
     */
    reconcileContradictoryEntries(reconciliationId: string, state: KnowledgeState, entryA: GovernedKnowledgeEntry, entryB: GovernedKnowledgeEntry): KnowledgeReconciliationResult;
    /**
     * EN: Retrieves merge result by ID.
     * VI: Lấy kết quả hợp nhất theo mã định danh.
     */
    getMergeResult(mergeId: string): KnowledgeMergeResult | undefined;
    /**
     * EN: Retrieves reconciliation result by ID.
     * VI: Lấy kết quả đối soát theo mã định danh.
     */
    getReconciliationResult(recId: string): KnowledgeReconciliationResult | undefined;
    /**
     * EN: Clears state.
     * VI: Xóa trạng thái.
     */
    clear(): void;
}
