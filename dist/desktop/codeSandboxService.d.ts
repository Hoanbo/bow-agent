export interface CodeSandboxOptions {
    code: string;
    language?: 'javascript' | 'typescript' | 'js' | 'ts';
    timeoutMs?: number;
    initialContext?: Record<string, any>;
}
export interface CodeSandboxExecutionResult {
    success: boolean;
    stdout: string;
    result: any;
    executionTimeMs: number;
    error?: string;
}
export declare class CodeSandboxService {
    /**
     * Execute dynamic JavaScript code safely with isolated context and strict timeout guard
     */
    executeCode(options: CodeSandboxOptions): Promise<CodeSandboxExecutionResult>;
}
export declare const codeSandboxService: CodeSandboxService;
