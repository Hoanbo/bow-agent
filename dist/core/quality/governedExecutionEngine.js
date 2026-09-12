// src/core/quality/governedExecutionEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Governed execution engine executing in-sandbox handlers with resource, timeout, and secret controls.
// Động cơ thực thi có quản trị chạy các trình xử lý trong sandbox với kiểm soát tài nguyên, thời gian chờ và bí mật.
//
// STRICT INVARIANTS:
// - ZERO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - COMMAND_EXECUTION != AUTHORIZATION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { QualityError, QualityErrorCode, } from './qualityTypes.js';
import { QualityCommandRegistry } from './qualityCommandRegistry.js';
import { QualityPolicyEngine } from './qualityPolicyEngine.js';
export class GovernedExecutionEngine {
    registry;
    constructor(registry = new QualityCommandRegistry()) {
        this.registry = registry;
    }
    /**
     * Computes deterministic SHA-256 hash for raw string payload.
     * Tính toán mã băm SHA-256 tất định cho khối dữ liệu chuỗi thô.
     */
    static hashPayload(payload) {
        return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    }
    /**
     * Scrubs sensitive tokens, authorization credentials, and secrets from output text.
     * Khử trùng các token nhạy cảm, thông tin ủy quyền và bí mật khỏi văn bản đầu ra.
     */
    static scrubSecrets(text) {
        if (!text)
            return '';
        return text
            .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
            .replace(/token[=:]\s*["']?[A-Za-z0-9\-_.]+["']?/gi, 'token=[REDACTED]')
            .replace(/password[=:]\s*["']?[^"'\s]+["']?/gi, 'password=[REDACTED]')
            .replace(/secret[=:]\s*["']?[^"'\s]+["']?/gi, 'secret=[REDACTED]')
            .replace(/api[_-]?key[=:]\s*["']?[A-Za-z0-9\-_.]+["']?/gi, 'apiKey=[REDACTED]');
    }
    /**
     * Executes an allowlisted command inside the governed sandbox environment.
     * Thực thi một lệnh thuộc danh sách cho phép bên trong môi trường sandbox có quản trị.
     */
    async executeCommand(commandId, context, sandbox, options) {
        const executedAt = Date.now();
        // 1. Stage: COMMAND_REQUEST & COMMAND_VALIDATION
        // 1. Giai đoạn: YÊU CẦU LỆNH & XÁC THỰC LỆNH
        const command = this.registry.getCommand(commandId);
        // Validate policies, bindings, and emergency controls.
        // Xác thực các chính sách, liên kết và kiểm soát khẩn cấp.
        QualityPolicyEngine.validateCommandExecution(command, context, sandbox, {
            isUserStopped: options?.isUserStopped,
            isRevoked: options?.isRevoked,
        });
        const timeoutLimit = options?.timeoutMs ?? command.timeoutMs ?? 60000;
        const maxOutput = options?.maxOutputSizeBytes ?? command.maxOutputSizeBytes ?? 1048576;
        // 2. Stage: COMMAND_EXECUTION with timeout boundary
        // 2. Giai đoạn: THỰC THI LỆNH với ranh giới thời gian chờ
        let rawResult;
        let timer;
        try {
            const timeoutPromise = new Promise((_, reject) => {
                timer = setTimeout(() => {
                    reject(new QualityError(QualityErrorCode.TIMEOUT_EXCEEDED, `Command "${commandId}" timed out after ${timeoutLimit}ms.`));
                }, timeoutLimit);
            });
            rawResult = await Promise.race([command.handler(context), timeoutPromise]);
        }
        catch (err) {
            if (err instanceof QualityError && err.code === QualityErrorCode.TIMEOUT_EXCEEDED) {
                return {
                    commandId,
                    context,
                    exitCode: 124,
                    stdout: '',
                    stderr: `Command timed out after ${timeoutLimit}ms.`,
                    stdoutHash: GovernedExecutionEngine.hashPayload(''),
                    stderrHash: GovernedExecutionEngine.hashPayload(`Command timed out after ${timeoutLimit}ms.`),
                    rawEvidenceHash: GovernedExecutionEngine.hashPayload(`${commandId}:timeout:124`),
                    durationMs: timeoutLimit,
                    timedOut: true,
                    interrupted: false,
                    artifactsProduced: [],
                    executedAt,
                };
            }
            throw err;
        }
        finally {
            // Clear timer to ensure event loop is not kept alive unnecessarily.
            // Xóa bộ hẹn giờ để đảm bảo vòng lặp sự kiện không bị giữ lại không cần thiết.
            if (timer !== undefined) {
                clearTimeout(timer);
            }
        }
        // 3. Stage: COMMAND_RESULT normalization & secret scrubbing
        // 3. Giai đoạn: Chuẩn hóa KẾT QUẢ LỆNH & khử trùng bí mật
        const sanitizedStdout = GovernedExecutionEngine.scrubSecrets(rawResult.stdout);
        const sanitizedStderr = GovernedExecutionEngine.scrubSecrets(rawResult.stderr);
        if (sanitizedStdout.length > maxOutput || sanitizedStderr.length > maxOutput) {
            throw new QualityError(QualityErrorCode.RESOURCE_LIMIT_EXCEEDED, `Command "${commandId}" exceeded maximum allowed output size (${maxOutput} bytes).`);
        }
        const stdoutHash = GovernedExecutionEngine.hashPayload(sanitizedStdout);
        const stderrHash = GovernedExecutionEngine.hashPayload(sanitizedStderr);
        const rawEvidenceHash = GovernedExecutionEngine.hashPayload(`${commandId}:${rawResult.exitCode}:${stdoutHash}:${stderrHash}:${rawResult.durationMs}`);
        // 4. Stage: COMMAND_VERIFICATION output packaging
        // 4. Giai đoạn: Đóng gói đầu ra XÁC MINH LỆNH
        return Object.freeze({
            commandId,
            context,
            exitCode: rawResult.exitCode,
            stdout: sanitizedStdout,
            stderr: sanitizedStderr,
            stdoutHash,
            stderrHash,
            rawEvidenceHash,
            durationMs: rawResult.durationMs,
            timedOut: rawResult.timedOut,
            interrupted: rawResult.interrupted,
            artifactsProduced: Object.freeze([...(rawResult.artifactsProduced ?? [])]),
            executedAt,
        });
    }
}
