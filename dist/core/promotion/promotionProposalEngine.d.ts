import { type PromotionProposal, type PromotionScope } from './promotionTypes.js';
import type { SandboxDescriptor, SandboxManifest, SandboxDiff } from '../sandbox/sandboxTypes.js';
export interface CreateProposalInput {
    readonly sandbox: SandboxDescriptor;
    readonly baseManifest: SandboxManifest;
    readonly currentManifest: SandboxManifest;
    readonly diff: SandboxDiff;
    readonly targetProjectRoot: string;
    readonly customScope?: Partial<PromotionScope>;
    readonly ttlMs?: number;
}
export declare class PromotionProposalEngine {
    /**
     * Computes deterministic SHA-256 hash representing a promotion proposal content.
     * Tính toán mã băm SHA-256 tất định đại diện cho nội dung đề xuất xúc tiến.
     */
    static hashProposal(sandboxId: string, targetProjectRoot: string, diffHash: string, manifestHash: string, changesCount: number): string;
    /**
     * Creates a structured promotion proposal from verified sandbox artifacts.
     * Tạo một đề xuất xúc tiến có cấu trúc từ các tạo phẩm sandbox đã được kiểm chứng.
     */
    createProposal(input: CreateProposalInput): PromotionProposal;
}
