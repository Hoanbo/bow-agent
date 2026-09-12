import { type PolicyEvolutionProposal, type PolicyReviewRecord, type PolicyRolloutRecord, type PolicyConfiguration } from './policyEvolutionTypes.js';
import { PolicySnapshotStore } from './policySnapshotStore.js';
import { WorldActionAuthorizationEngine } from '../world-action/worldActionAuthorization.js';
export interface ExecuteRolloutInput {
    readonly proposal: PolicyEvolutionProposal;
    readonly reviewRecord: PolicyReviewRecord;
    readonly provenanceSha256: string;
    readonly userId?: string;
}
export declare class GovernedPolicyRolloutEngine {
    private readonly snapshotStore;
    private readonly authEngine;
    constructor(snapshotStore?: PolicySnapshotStore, authEngine?: WorldActionAuthorizationEngine);
    /**
     * Applies an authorized policy evolution transactionally.
     * Consumes authorization token atomically to guarantee single-use anti-replay enforcement.
     * Áp dụng tiến hóa chính sách được ủy quyền theo cơ chế giao dịch.
     */
    executeRollout(input: ExecuteRolloutInput): {
        readonly rolloutRecord: PolicyRolloutRecord;
        readonly updatedConfiguration: PolicyConfiguration;
    };
    /**
     * Structural integrity verification of a policy configuration.
     * Xác minh tính toàn vẹn cấu trúc của cấu hình chính sách.
     */
    verifyConfigIntegrity(config: PolicyConfiguration): boolean;
}
