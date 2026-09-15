// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1151: StrategicKnowledgeIndexingEngine
// Multi-Dimensional Strategic Indexing & Cycle-Free Lineage DAG Engine
// ============================================================================
import { MAX_LINEAGE_DEPTH, GovernedStrategicMemoryError, GovernedStrategicMemorySecurityError, computeStrategicIndexEntryHash, } from './GovernedStrategicMemoryTypes';
export class StrategicKnowledgeIndexingEngine {
    indexEntries = new Map();
    tenantMissionIndex = new Map(); // tenant -> mission -> Set<recordId>
    tenantFederationIndex = new Map(); // tenant -> federation -> Set<recordId>
    lineageGraph = new Map(); // parentRecordId -> Set<childRecordId>
    // EN: Indexes a strategic memory record across multi-dimensional keys and maintains the lineage graph.
    // VI: Lập chỉ mục bản ghi bộ nhớ chiến lược theo đa chiều và duy trì đồ thị nguồn gốc (lineage).
    indexRecord(record, parentRecordIds = []) {
        this.assertValidTenant(record.tenantId);
        // Lineage graph cycle detection and depth verification
        if (parentRecordIds.length > 0) {
            this.validateLineageAndDetectCycles(record.recordId, parentRecordIds);
        }
        const keywords = this.extractKeywords(record);
        const indexId = `idx_${record.recordId}`;
        const rawEntry = {
            indexId,
            tenantId: record.tenantId,
            recordId: record.recordId,
            missionId: record.missionId,
            objectiveId: record.objectiveId,
            participatingFederations: [...record.participatingFederations],
            keywords,
            confidenceScore: record.confidenceScore,
            creationTimestamp: record.creationTimestamp,
            entryHash: '',
        };
        const entryHash = computeStrategicIndexEntryHash(rawEntry);
        const entry = { ...rawEntry, entryHash };
        this.indexEntries.set(indexId, entry);
        // Update mission index
        let missionMap = this.tenantMissionIndex.get(record.tenantId);
        if (!missionMap) {
            missionMap = new Map();
            this.tenantMissionIndex.set(record.tenantId, missionMap);
        }
        let missionRecords = missionMap.get(record.missionId);
        if (!missionRecords) {
            missionRecords = new Set();
            missionMap.set(record.missionId, missionRecords);
        }
        missionRecords.add(record.recordId);
        // Update federation index
        let fedMap = this.tenantFederationIndex.get(record.tenantId);
        if (!fedMap) {
            fedMap = new Map();
            this.tenantFederationIndex.set(record.tenantId, fedMap);
        }
        for (const fedId of record.participatingFederations) {
            let fedRecords = fedMap.get(fedId);
            if (!fedRecords) {
                fedRecords = new Set();
                fedMap.set(fedId, fedRecords);
            }
            fedRecords.add(record.recordId);
        }
        // Update lineage graph
        for (const parentId of parentRecordIds) {
            let children = this.lineageGraph.get(parentId);
            if (!children) {
                children = new Set();
                this.lineageGraph.set(parentId, children);
            }
            children.add(record.recordId);
        }
        return entry;
    }
    // EN: Finds record IDs matching a mission within a tenant partition.
    // VI: Tìm các record ID khớp với mission trong phân vùng tenant.
    findRecordsByMission(tenantId, missionId) {
        this.assertValidTenant(tenantId);
        const missionMap = this.tenantMissionIndex.get(tenantId);
        if (!missionMap) {
            return [];
        }
        const recordIds = missionMap.get(missionId);
        return recordIds ? Array.from(recordIds) : [];
    }
    // EN: Finds record IDs matching participating federations within a tenant partition.
    // VI: Tìm các record ID khớp với các federation tham gia trong phân vùng tenant.
    findRecordsByFederation(tenantId, federationId) {
        this.assertValidTenant(tenantId);
        const fedMap = this.tenantFederationIndex.get(tenantId);
        if (!fedMap) {
            return [];
        }
        const recordIds = fedMap.get(federationId);
        return recordIds ? Array.from(recordIds) : [];
    }
    // EN: Clears all indexes (used in testing).
    // VI: Xoá toàn bộ chỉ mục (dùng trong kiểm thử).
    clear() {
        this.indexEntries.clear();
        this.tenantMissionIndex.clear();
        this.tenantFederationIndex.clear();
        this.lineageGraph.clear();
    }
    // --------------------------------------------------------------------------
    // Private Lineage & Cycle-Detection Logic
    // --------------------------------------------------------------------------
    validateLineageAndDetectCycles(newRecordId, parentRecordIds) {
        // 1. Cycle detection: if any parent is or reaches newRecordId, reject
        for (const parentId of parentRecordIds) {
            if (parentId === newRecordId) {
                throw new GovernedStrategicMemoryError(`Self-referential lineage cycle detected on record '${newRecordId}'`, 'LINEAGE_CYCLE_DETECTED');
            }
            const visited = new Set();
            if (this.reachesNode(newRecordId, parentId, visited)) {
                throw new GovernedStrategicMemoryError(`Lineage cycle detected: adding edge from '${parentId}' to '${newRecordId}' creates a directed cycle`, 'LINEAGE_CYCLE_DETECTED');
            }
        }
        // 2. Lineage depth check: compute max path length leading to newRecordId
        for (const parentId of parentRecordIds) {
            const depth = this.computeAncestorDepth(parentId, 1, new Set());
            if (depth >= MAX_LINEAGE_DEPTH) {
                throw new GovernedStrategicMemoryError(`Max lineage depth ceiling exceeded (${depth + 1} > ${MAX_LINEAGE_DEPTH})`, 'MAX_LINEAGE_DEPTH_EXCEEDED');
            }
        }
    }
    reachesNode(startId, targetId, visited) {
        if (startId === targetId) {
            return true;
        }
        if (visited.has(startId)) {
            return false;
        }
        visited.add(startId);
        const children = this.lineageGraph.get(startId);
        if (children) {
            for (const childId of children) {
                if (this.reachesNode(childId, targetId, visited)) {
                    return true;
                }
            }
        }
        return false;
    }
    computeAncestorDepth(currentId, currentDepth, visited) {
        if (visited.has(currentId)) {
            return currentDepth;
        }
        visited.add(currentId);
        let maxDepth = currentDepth;
        // Search who lists currentId as child
        for (const [parent, children] of this.lineageGraph.entries()) {
            if (children.has(currentId)) {
                const d = this.computeAncestorDepth(parent, currentDepth + 1, visited);
                if (d > maxDepth) {
                    maxDepth = d;
                }
            }
        }
        return maxDepth;
    }
    extractKeywords(record) {
        const rawText = `${record.missionId} ${record.objectiveId} ${record.convergedStrategyDigest}`;
        const words = rawText
            .toLowerCase()
            .replace(/[^a-z0-9_\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length >= 3);
        return Array.from(new Set(words)).sort();
    }
    assertValidTenant(tenantId) {
        if (!tenantId || tenantId.trim().length === 0) {
            throw new GovernedStrategicMemorySecurityError('Tenant identifier must not be empty');
        }
    }
}
