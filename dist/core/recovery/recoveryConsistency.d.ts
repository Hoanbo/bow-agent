import type { LifecycleState, LifecycleCheckpoint } from '../lifecycle/lifecycleTypes.js';
import type { VerificationStatus } from '../verification/verificationStatus.js';
import type { CommitStatus } from '../commit/commitTypes.js';
import type { CrashConsistencyCondition } from './recoveryTypes.js';
export interface CrashConsistencyEvaluation {
    readonly condition: CrashConsistencyCondition;
    readonly isConsistent: boolean;
    readonly issues: readonly string[];
    readonly details: Readonly<Record<string, unknown>>;
}
/**
 * EN: Evaluates crash consistency from available durable and in-flight evidence.
 * VI: Đánh giá tính nhất quán sự cố từ các bằng chứng bền vững và đang diễn ra có sẵn.
 */
export declare function evaluateCrashConsistency(activeLifecycleState?: LifecycleState, checkpoints?: readonly LifecycleCheckpoint[], verificationRecord?: {
    verificationId: string;
    status: VerificationStatus;
    taskSucceeded: boolean;
}, commitRecord?: {
    commitId: string;
    status: CommitStatus;
    isPartial?: boolean;
}): CrashConsistencyEvaluation;
