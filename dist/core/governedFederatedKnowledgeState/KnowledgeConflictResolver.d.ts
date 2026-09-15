import { KnowledgeConflictCategory, GovernedKnowledgeEntry } from './GovernedFederatedKnowledgeStateTypes.js';
export interface KnowledgeConflictResolution {
    readonly conflictId: string;
    readonly category: KnowledgeConflictCategory;
    readonly resolvable: boolean;
    readonly strategy: 'AUTOMATIC_RECONCILED' | 'REVIEW_REQUIRED' | 'FAIL_CLOSED';
    readonly explanation: string;
    readonly resolvedContent?: string;
    readonly provenanceHash: string;
}
export declare class KnowledgeConflictResolver {
    /**
     * EN: Detects and classifies conflicts between two knowledge entries.
     * VI: Phát hiện và phân loại xung đột giữa hai mục tri thức.
     */
    detectConflict(entryA: GovernedKnowledgeEntry, entryB: GovernedKnowledgeEntry): KnowledgeConflictCategory | undefined;
    /**
     * EN: Resolves a detected conflict between two knowledge entries without manufacturing authority.
     * VI: Xử lý một xung đột đã phát hiện giữa hai mục tri thức mà không tự tạo thẩm quyền.
     */
    resolveConflict(entryA: GovernedKnowledgeEntry, entryB: GovernedKnowledgeEntry, category: KnowledgeConflictCategory): KnowledgeConflictResolution;
}
