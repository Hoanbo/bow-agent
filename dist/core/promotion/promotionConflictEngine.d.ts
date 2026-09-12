import { type PromotionProposal, type PromotionConflict } from './promotionTypes.js';
import type { SandboxEntry } from '../sandbox/sandboxTypes.js';
export interface ConflictCheckInput {
    readonly proposal: PromotionProposal;
    readonly targetEntries?: readonly SandboxEntry[];
    readonly targetBaseManifestHash?: string;
    readonly concurrentActiveProposals?: readonly PromotionProposal[];
}
export declare class PromotionConflictEngine {
    /**
     * Evaluates conflicts between proposed changes and current target project state.
     * Đánh giá các xung đột giữa các thay đổi đề xuất và trạng thái hiện tại của dự án mục tiêu.
     */
    detectConflicts(input: ConflictCheckInput): PromotionConflict[];
}
