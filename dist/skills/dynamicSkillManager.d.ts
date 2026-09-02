export interface DynamicSkill {
    id: string;
    name: string;
    description: string;
    code: string;
    parametersSchema: Record<string, any>;
    author: 'boss' | 'bow_con_synthesized';
    createdAt: string;
    updatedAt: string;
    executionCount: number;
    lastExecutionSuccess?: boolean;
}
export declare class DynamicSkillManager {
    private skillsDir;
    private skills;
    constructor(customDir?: string);
    private initStorage;
    private loadAllSkills;
    /**
     * Đăng ký nóng (Hot-registration) một skill động vào Tool Registry của Agent
     */
    hotRegisterToToolRegistry(skill: DynamicSkill): void;
    /**
     * Thêm hoặc cập nhật một kỹ năng mới
     */
    registerSkill(skillDraft: Omit<DynamicSkill, 'createdAt' | 'updatedAt' | 'executionCount'>): DynamicSkill;
    getSkill(id: string): DynamicSkill | undefined;
    listSkills(): DynamicSkill[];
    /**
     * Thực thi một kỹ năng động trong môi trường Sandbox
     */
    executeSkill(id: string, args: Record<string, any>, context?: any): Promise<{
        success: boolean;
        result?: any;
        error?: string;
        executionTimeMs: number;
    }>;
    private saveSkillToDisk;
}
export declare const globalSkillManager: DynamicSkillManager;
