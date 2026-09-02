import { DynamicSkill } from '../skills/dynamicSkillManager.js';
export interface SandboxTestResult {
    success: boolean;
    output?: any;
    error?: string;
    executionTimeMs: number;
    syntaxValid: boolean;
    canSynthesize: boolean;
}
export interface SkillSynthesisDraft {
    id: string;
    name: string;
    description: string;
    code: string;
    testArgs?: Record<string, any>;
    parametersSchema?: Record<string, any>;
    author?: 'boss' | 'bow_con_synthesized';
}
export declare class SandboxRunner {
    private timeoutMs;
    constructor(timeoutMs?: number);
    /**
     * Kiểm tra cú pháp mã code JavaScript/TypeScript
     */
    validateSyntax(code: string): {
        valid: boolean;
        error?: string;
    };
    /**
     * Chạy thử nghiệm mã code trong môi trường Sandbox cách ly
     */
    executeInSandbox(code: string, testArgs?: Record<string, any>, context?: Record<string, any>): Promise<SandboxTestResult>;
    /**
     * Thử nghiệm và Tự động đóng gói thành Kỹ Năng Động (Self-Tool Synthesis)
     */
    testAndSynthesizeSkill(draft: SkillSynthesisDraft): Promise<{
        success: boolean;
        synthesizedSkill?: DynamicSkill;
        debugFeedback?: string;
    }>;
}
export declare const globalSandboxRunner: SandboxRunner;
