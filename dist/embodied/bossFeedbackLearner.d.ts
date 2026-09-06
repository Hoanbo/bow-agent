import { DurableJsonStore } from '../core/persistence/durableJsonStore.js';
export interface BossRule {
    id: string;
    pattern: string;
    instruction: string;
    category: 'addressing' | 'policy' | 'behavior' | 'shop_knowledge';
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
}
export declare class BossFeedbackLearner {
    readonly baseDir: string;
    readonly legacyFilePath: string;
    private singleFileOverride?;
    private stores;
    constructor(customBaseDirOrFilePath?: string, customLegacyFilePathOrAllowedDir?: string);
    /**
     * Resolve or initialize the isolated DurableJsonStore for the specified user.
     */
    getStore(userId?: string): DurableJsonStore<BossRule[]>;
    getDefaultRules(): BossRule[];
    saveRules(userIdOrRules: string | BossRule[], maybeRules?: BossRule[]): void;
    getRules(userId?: string): BossRule[];
    /**
     * Thêm hoặc cập nhật một quy tắc do Sếp dạy
     */
    addRule(userIdOrRule: string | Omit<BossRule, 'id' | 'createdAt' | 'updatedAt' | 'enabled'>, maybeRule?: Omit<BossRule, 'id' | 'createdAt' | 'updatedAt' | 'enabled'>): BossRule;
    /**
     * Phân tích câu nói của Sếp xem có chứa tín hiệu "Sửa sai / Dạy dỗ" không
     */
    detectCorrectionPattern(userText: string, userId?: string): {
        isCorrection: boolean;
        learnedRule?: BossRule;
        replyMessage?: string;
    };
    /**
     * Tạo văn bản Prompt nạp vào System Prompt
     */
    getPromptInjections(userId?: string): string;
}
export declare const globalBossFeedback: BossFeedbackLearner;
