import { GovernedDelegation, DelegationConflict } from './multiAgentFederationTypes.js';
export interface ConflictResolutionResult {
    readonly conflictId: string;
    readonly isResolved: boolean;
    readonly resolutionStrategy?: string;
    readonly requiresHumanReview: boolean;
}
export declare class DelegationConflictResolver {
    /**
     * EN: Detects conflicts between candidate delegation and currently active delegations.
     * VI: Phát hiện xung đột giữa ủy quyền ứng viên và các ủy quyền hiện đang hoạt động.
     */
    detectConflicts(candidate: GovernedDelegation, activeDelegations: readonly GovernedDelegation[]): readonly DelegationConflict[];
    /**
     * EN: Resolves a delegation conflict deterministically.
     * VI: Giải quyết xung đột ủy quyền một cách xác định.
     */
    resolveConflict(conflict: DelegationConflict): ConflictResolutionResult;
}
