import { type BuildExecutionResult, type CommandExecutionContext } from './qualityTypes.js';
import { GovernedExecutionEngine, type ExecuteCommandOptions } from './governedExecutionEngine.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
export declare class BuildExecutionEngine {
    private readonly executionEngine;
    constructor(executionEngine?: GovernedExecutionEngine);
    /**
     * Computes deterministic SHA-256 hash representing a build execution result.
     * Tính toán mã băm SHA-256 tất định đại diện cho kết quả thực thi bản dựng.
     */
    static hashBuildResult(executionId: string, commandId: string, exitCode: number, stdoutHash: string, stderrHash: string, artifactCount: number): string;
    /**
     * Executes a governed build command within an isolated sandbox and returns normalized evidence.
     * Thực thi lệnh dựng có quản trị bên trong sandbox cô lập và trả về bằng chứng chuẩn hóa.
     */
    executeBuild(commandId: string, context: CommandExecutionContext, sandbox: SandboxDescriptor, options?: ExecuteCommandOptions): Promise<BuildExecutionResult>;
}
