import type { LifecycleCheckpoint } from '../lifecycle/lifecycleTypes.js';
import type { LastKnownGoodState } from './recoveryTypes.js';
/**
 * EN: Resolves the Last Known Good State from durable checkpoints and optional commit/verification records.
 * VI: Phân giải Trạng thái Tốt được Biết Cuối cùng từ các checkpoint bền vững và bản ghi commit/xác minh tùy chọn.
 */
export declare function resolveLastKnownGoodState(userId: string, sessionId: string, checkpoints?: readonly LifecycleCheckpoint[], commitRecord?: {
    commitId: string;
    status: string;
    isPartial?: boolean;
}, verificationRecord?: {
    verificationId: string;
    status: string;
    taskSucceeded: boolean;
}): LastKnownGoodState | null;
