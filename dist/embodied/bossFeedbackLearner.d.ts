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
    private rules;
    private filePath;
    constructor(customFilePath?: string);
    private getDefaultRules;
    private loadRules;
    saveRules(rulesToSave?: BossRule[]): void;
    getRules(): BossRule[];
    /**
     * Thêm hoặc cập nhật một quy tắc do Sếp dạy
     */
    addRule(rule: Omit<BossRule, 'id' | 'createdAt' | 'updatedAt' | 'enabled'>): BossRule;
    /**
     * Phân tích câu nói của Sếp xem có chứa tín hiệu "Sửa sai / Dạy dỗ" không
     */
    detectCorrectionPattern(userText: string): {
        isCorrection: boolean;
        learnedRule?: BossRule;
        replyMessage?: string;
    };
    /**
     * Tạo văn bản Prompt nạp vào System Prompt
     */
    getPromptInjections(): string;
}
export declare const globalBossFeedback: BossFeedbackLearner;
