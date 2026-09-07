import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { CommitPlan, CommitOperation, PreCommitSnapshot } from './commitTypes.js';
/**
 * EN: Creates an immutable CommitPlan.
 * VI: Tạo một CommitPlan bất biến.
 */
export declare function createCommitPlan(params: {
    userId: string;
    sessionId: string;
    verificationId: string;
    operations: readonly CommitOperation[];
    riskLevel: PlanRiskLevel;
    governanceRequired?: boolean;
    approvalRequired?: boolean;
    preCommitSnapshot: PreCommitSnapshot;
    requestId?: string;
}): Readonly<CommitPlan>;
