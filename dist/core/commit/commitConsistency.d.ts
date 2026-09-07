import type { CommitPlan, PreCommitSnapshot, PostCommitSnapshot, ConsistencyValidationResult } from './commitTypes.js';
/**
 * EN: Evaluates mutual state consistency across pre-commit, post-commit, and commit plan.
 * VI: Đánh giá tính nhất quán trạng thái tương hỗ giữa pre-commit, post-commit và kế hoạch commit.
 */
export declare function evaluateCommitConsistency(preSnapshot: PreCommitSnapshot, postSnapshot?: PostCommitSnapshot, plan?: CommitPlan): Readonly<ConsistencyValidationResult>;
