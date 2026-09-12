import { type SandboxDescriptor, type SandboxManifest, type SandboxDiff } from './sandboxTypes.js';
import { SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
export interface SandboxReviewInput {
    readonly sandbox: SandboxDescriptor;
    readonly manifest: SandboxManifest;
    readonly diff: SandboxDiff;
    readonly reviewerId: string;
    readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
    readonly decision?: 'APPROVED' | 'REJECTED' | 'ESCALATED_TO_HUMAN';
    readonly notes?: string;
}
export interface SandboxReviewRecord {
    readonly reviewId: string;
    readonly sandboxId: string;
    readonly taskId: string;
    readonly sessionId: string;
    readonly reviewedAt: number;
    readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
    readonly reviewerId: string;
    readonly decision: 'APPROVED' | 'REJECTED' | 'ESCALATED_TO_HUMAN';
    readonly ownerApproved: boolean;
    readonly manifestHash: string;
    readonly diffHash: string;
    readonly notes?: string;
}
export declare class SandboxReviewEngine {
    private readonly humanGate;
    private reviews;
    constructor(humanGate?: SupervisorHumanGate);
    /**
     * Reviews a prepared sandbox, manifest, and diff prior to potential commit or export.
     * Xem xét một sandbox, bản kê khai và bản diff đã chuẩn bị trước khi cho phép commit hoặc xuất.
     */
    reviewSandbox(input: SandboxReviewInput): SandboxReviewRecord;
    /**
     * Requests canonical HumanGate approval for high-consequence sandbox modifications.
     * Yêu cầu phê duyệt qua HumanGate chuẩn tắc đối với các sửa đổi sandbox có hệ quả cao.
     */
    requestHumanGateApproval(sandbox: SandboxDescriptor, diff: SandboxDiff, actionName?: string): Promise<boolean>;
    /**
     * Retrieves a recorded review record by reviewId.
     * Lấy bản ghi đánh giá đã lưu theo reviewId.
     */
    getReview(reviewId: string): SandboxReviewRecord | undefined;
    /**
     * Clears in-memory reviews.
     * Xóa lịch sử đánh giá trong bộ nhớ.
     */
    clear(): void;
}
