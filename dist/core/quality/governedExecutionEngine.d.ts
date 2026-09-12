import { type CommandExecutionContext } from './qualityTypes.js';
import { QualityCommandRegistry } from './qualityCommandRegistry.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
export interface ExecuteCommandOptions {
    readonly timeoutMs?: number;
    readonly maxOutputSizeBytes?: number;
    readonly isUserStopped?: boolean;
    readonly isRevoked?: boolean;
}
export interface ExecutedCommandResult {
    readonly commandId: string;
    readonly context: CommandExecutionContext;
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
    readonly stdoutHash: string;
    readonly stderrHash: string;
    readonly rawEvidenceHash: string;
    readonly durationMs: number;
    readonly timedOut: boolean;
    readonly interrupted: boolean;
    readonly artifactsProduced: readonly string[];
    readonly executedAt: number;
}
export declare class GovernedExecutionEngine {
    private readonly registry;
    constructor(registry?: QualityCommandRegistry);
    /**
     * Computes deterministic SHA-256 hash for raw string payload.
     * Tính toán mã băm SHA-256 tất định cho khối dữ liệu chuỗi thô.
     */
    static hashPayload(payload: string): string;
    /**
     * Scrubs sensitive tokens, authorization credentials, and secrets from output text.
     * Khử trùng các token nhạy cảm, thông tin ủy quyền và bí mật khỏi văn bản đầu ra.
     */
    static scrubSecrets(text: string): string;
    /**
     * Executes an allowlisted command inside the governed sandbox environment.
     * Thực thi một lệnh thuộc danh sách cho phép bên trong môi trường sandbox có quản trị.
     */
    executeCommand(commandId: string, context: CommandExecutionContext, sandbox: SandboxDescriptor, options?: ExecuteCommandOptions): Promise<ExecutedCommandResult>;
}
