import { type TestExecutionResult, type TestResultSummary, type CommandExecutionContext } from './qualityTypes.js';
import { GovernedExecutionEngine, type ExecuteCommandOptions } from './governedExecutionEngine.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
export declare class TestExecutionEngine {
    private readonly executionEngine;
    constructor(executionEngine?: GovernedExecutionEngine);
    /**
     * Computes deterministic SHA-256 hash representing a test execution result.
     * Tính toán mã băm SHA-256 tất định đại diện cho kết quả thực thi kiểm thử.
     */
    static hashTestResult(executionId: string, commandId: string, exitCode: number, stdoutHash: string, stderrHash: string, summary: TestResultSummary): string;
    /**
     * Extracts test metrics deterministically from stdout without fabrication.
     * Trích xuất các chỉ số kiểm thử tất định từ stdout mà không bịa đặt.
     */
    static parseTestSummary(stdout: string, exitCode: number): TestResultSummary;
    /**
     * Executes a governed test suite within an isolated sandbox and returns normalized evidence.
     * Thực thi bộ kiểm thử có quản trị bên trong sandbox cô lập và trả về bằng chứng chuẩn hóa.
     */
    executeTest(commandId: string, context: CommandExecutionContext, sandbox: SandboxDescriptor, options?: ExecuteCommandOptions): Promise<TestExecutionResult>;
}
