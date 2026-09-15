import { KnowledgeState, GovernedKnowledgeEntry, KnowledgeLifecycleStatus } from './GovernedFederatedKnowledgeStateTypes.js';
import { FederatedKnowledgeRegistry } from './FederatedKnowledgeRegistry.js';
import { FederatedKnowledgeSecurityBoundary } from './FederatedKnowledgeSecurityBoundary.js';
import { KnowledgeLineageEngine } from './KnowledgeLineageEngine.js';
import { KnowledgeMergeReconciliationEngine } from './KnowledgeMergeReconciliationEngine.js';
import { KnowledgeConflictResolver } from './KnowledgeConflictResolver.js';
import { CollectiveIntelligenceGovernanceEngine } from './CollectiveIntelligenceGovernanceEngine.js';
import { KnowledgeContinuityPersistenceBridge } from './KnowledgeContinuityPersistenceBridge.js';
export interface CreateKnowledgeStateParams {
    readonly stateId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly federationId: string;
    readonly generation: number;
    readonly expiresAt: number;
}
export declare class GovernedKnowledgeStateEngine {
    private readonly registry;
    private readonly securityBoundary;
    private readonly lineageEngine;
    private readonly mergeEngine;
    private readonly conflictResolver;
    private readonly governanceEngine;
    private readonly persistenceBridge;
    private readonly states;
    constructor(options?: {
        readonly registry?: FederatedKnowledgeRegistry;
        readonly securityBoundary?: FederatedKnowledgeSecurityBoundary;
        readonly lineageEngine?: KnowledgeLineageEngine;
        readonly mergeEngine?: KnowledgeMergeReconciliationEngine;
        readonly conflictResolver?: KnowledgeConflictResolver;
        readonly governanceEngine?: CollectiveIntelligenceGovernanceEngine;
        readonly persistenceBridge?: KnowledgeContinuityPersistenceBridge;
    });
    getRegistry(): FederatedKnowledgeRegistry;
    getSecurityBoundary(): FederatedKnowledgeSecurityBoundary;
    getLineageEngine(): KnowledgeLineageEngine;
    getMergeEngine(): KnowledgeMergeReconciliationEngine;
    getConflictResolver(): KnowledgeConflictResolver;
    getGovernanceEngine(): CollectiveIntelligenceGovernanceEngine;
    getPersistenceBridge(): KnowledgeContinuityPersistenceBridge;
    /**
     * EN: Creates a new governed knowledge state.
     * VI: Tạo một trạng thái tri thức có quản trị mới.
     */
    createKnowledgeState(params: CreateKnowledgeStateParams): KnowledgeState;
    /**
     * EN: Adds or updates a knowledge entry in the state enforcing capacity and OCC.
     * VI: Thêm hoặc cập nhật một mục tri thức trong trạng thái, thực thi dung lượng và OCC.
     */
    addKnowledgeEntry(stateId: string, entry: GovernedKnowledgeEntry, expectedVersion: number): KnowledgeState;
    /**
     * EN: Transitions knowledge state status.
     * VI: Chuyển đổi trạng thái vòng đời của trạng thái tri thức.
     */
    transitionStateStatus(stateId: string, newStatus: KnowledgeLifecycleStatus, tenantId: string, sessionId: string): KnowledgeState;
    /**
     * EN: Retrieves state by ID.
     * VI: Lấy trạng thái theo mã định danh.
     */
    getState(stateId: string): KnowledgeState | undefined;
    /**
     * EN: Clears state.
     * VI: Xóa trạng thái.
     */
    clear(): void;
}
