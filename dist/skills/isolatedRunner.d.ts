export interface SandboxExecutionResult {
    success: boolean;
    result?: any;
    error?: string;
    executionDurationMs: number;
    memoryUsageBytes?: number;
}
export interface IsolatedRunnerOptions {
    timeoutMs?: number;
    maxOutputBytes?: number;
}
export declare class IsolatedRunner {
    private timeoutMs;
    private maxOutputBytes;
    private quarantinedSkills;
    constructor(options?: IsolatedRunnerOptions);
    /**
     * Run code inside a completely isolated VM context with banned OS/network globals
     */
    executeInSandbox(code: string, inputs?: Record<string, any>): Promise<SandboxExecutionResult>;
    /**
     * Sign a verified skill artifact with HMAC-SHA256
     */
    signSkillArtifact(skillId: string, code: string, secret: string): string;
    /**
     * Verify a skill artifact signature
     */
    verifySkillArtifact(skillId: string, code: string, signature: string, secret: string): boolean;
    quarantineSkill(skillId: string): void;
    isQuarantined(skillId: string): boolean;
    private isMalicious;
}
export declare const globalIsolatedRunner: IsolatedRunner;
