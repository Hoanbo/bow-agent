// src/core/governedFederatedKnowledgeState/KnowledgeLineageEngine.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1131 — REAL
//
// EN: Governed lineage engine tracking origin chains from observations and memories through consensus to knowledge,
//     enforcing depth limits (<= 20) and cryptographic provenance chaining without fabrication.
// VI: Động cơ huyết thống có quản trị theo dõi chuỗi nguồn gốc từ quan sát và bộ nhớ qua đồng thuận tới tri thức,
//     thực thi giới hạn độ sâu (<= 20) và chuỗi băm nguồn gốc mật mã mà không bịa đặt.
import { MAX_LINEAGE_DEPTH, GovernedFederatedKnowledgeStateValidationError, GovernedFederatedKnowledgeStateLineageError, computeKnowledgeLineageHash, } from './GovernedFederatedKnowledgeStateTypes.js';
export class KnowledgeLineageEngine {
    lineages = new Map();
    /**
     * EN: Registers a new immutable lineage record.
     * VI: Đăng ký một bản ghi huyết thống bất biến mới.
     */
    recordLineage(params) {
        if (!params.lineageId || params.lineageId.trim().length === 0) {
            throw new GovernedFederatedKnowledgeStateValidationError('Lineage ID cannot be empty');
        }
        if (this.lineages.has(params.lineageId)) {
            throw new GovernedFederatedKnowledgeStateValidationError(`Lineage record '${params.lineageId}' already exists`);
        }
        if (!params.targetKnowledgeId) {
            throw new GovernedFederatedKnowledgeStateValidationError('Target knowledge ID is required');
        }
        if (params.sourceIds.length === 0) {
            throw new GovernedFederatedKnowledgeStateValidationError('At least one source ID is required');
        }
        // Calculate depth based on parents
        let maxParentDepth = 0;
        for (const parentId of params.parentLineageIds) {
            const parent = this.lineages.get(parentId);
            if (!parent) {
                throw new GovernedFederatedKnowledgeStateLineageError(`Parent lineage '${parentId}' not found in lineage registry`);
            }
            if (parent.depth > maxParentDepth) {
                maxParentDepth = parent.depth;
            }
        }
        const currentDepth = maxParentDepth + 1;
        if (currentDepth > MAX_LINEAGE_DEPTH) {
            throw new GovernedFederatedKnowledgeStateLineageError(`Lineage exceeded MAX_LINEAGE_DEPTH limit (${MAX_LINEAGE_DEPTH}): depth is ${currentDepth}`);
        }
        const now = Date.now();
        const base = {
            lineageId: params.lineageId,
            targetKnowledgeId: params.targetKnowledgeId,
            parentLineageIds: [...params.parentLineageIds],
            sourceIds: [...params.sourceIds],
            sourceTypes: [...params.sourceTypes],
            sourceGenerations: [...params.sourceGenerations],
            sourceAgentIds: [...params.sourceAgentIds],
            depth: currentDepth,
            derivationType: params.derivationType,
            timestamp: now,
        };
        const provenanceHash = computeKnowledgeLineageHash(base);
        const record = {
            ...base,
            provenanceHash,
        };
        this.lineages.set(record.lineageId, record);
        return record;
    }
    /**
     * EN: Verifies cryptographic provenance integrity of a lineage chain.
     * VI: Xác minh tính toàn vẹn nguồn gốc mật mã của một chuỗi huyết thống.
     */
    verifyLineageIntegrity(lineageId) {
        const record = this.lineages.get(lineageId);
        if (!record)
            return false;
        const base = {
            lineageId: record.lineageId,
            targetKnowledgeId: record.targetKnowledgeId,
            parentLineageIds: record.parentLineageIds,
            sourceIds: record.sourceIds,
            sourceTypes: record.sourceTypes,
            sourceGenerations: record.sourceGenerations,
            sourceAgentIds: record.sourceAgentIds,
            depth: record.depth,
            derivationType: record.derivationType,
            timestamp: record.timestamp,
        };
        if (computeKnowledgeLineageHash(base) !== record.provenanceHash) {
            return false;
        }
        for (const parentId of record.parentLineageIds) {
            if (!this.verifyLineageIntegrity(parentId)) {
                return false;
            }
        }
        return true;
    }
    /**
     * EN: Retrieves lineage record by ID.
     * VI: Lấy bản ghi huyết thống theo mã định danh.
     */
    getLineage(lineageId) {
        return this.lineages.get(lineageId);
    }
    /**
     * EN: Clears state.
     * VI: Xóa trạng thái.
     */
    clear() {
        this.lineages.clear();
    }
}
