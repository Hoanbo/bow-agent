import { type PolicyRolloutRecord, type PolicyRollbackRecord, type PolicySnapshot } from './policyEvolutionTypes.js';
import { PolicySnapshotStore } from './policySnapshotStore.js';
export interface ExecutePolicyRollbackInput {
    readonly rolloutRecord: PolicyRolloutRecord;
    readonly reason: string;
    readonly userId?: string;
}
export declare class PolicyEvolutionRollbackEngine {
    private readonly snapshotStore;
    constructor(snapshotStore?: PolicySnapshotStore);
    /**
     * Restores the verified pre-rollout policy snapshot.
     * Restores known-good state deterministically.
     * Khôi phục bản chụp chính sách đã xác minh trước khi triển khai.
     */
    executeRollback(input: ExecutePolicyRollbackInput): {
        readonly rollbackRecord: PolicyRollbackRecord;
        readonly restoredSnapshot: PolicySnapshot;
    };
}
