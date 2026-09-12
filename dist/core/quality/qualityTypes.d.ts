import type { SandboxId, WorktreeId } from '../sandbox/sandboxTypes.js';
export declare const QUALITY_SCHEMA_VERSION: "4.0.0";
/**
 * Branded identifier for a governed build execution.
 * Định danh có thương hiệu cho một lượt thực thi bản dựng có quản trị.
 */
export type BuildExecutionId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded BuildExecutionId.
 * Hàm hỗ trợ tạo BuildExecutionId có thương hiệu.
 */
export declare function createBuildExecutionId(id: string): BuildExecutionId;
/**
 * Branded identifier for a governed test execution.
 * Định danh có thương hiệu cho một lượt thực thi kiểm thử có quản trị.
 */
export type TestExecutionId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded TestExecutionId.
 * Hàm hỗ trợ tạo TestExecutionId có thương hiệu.
 */
export declare function createTestExecutionId(id: string): TestExecutionId;
/**
 * Branded identifier for a verified quality report.
 * Định danh có thương hiệu cho một báo cáo chất lượng đã được xác minh.
 */
export type QualityReportId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded QualityReportId.
 * Hàm hỗ trợ tạo QualityReportId có thương hiệu.
 */
export declare function createQualityReportId(id: string): QualityReportId;
/**
 * Branded identifier for an aggregated quality evidence bundle.
 * Định danh có thương hiệu cho một gói bằng chứng chất lượng tổng hợp.
 */
export type QualityEvidenceId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded QualityEvidenceId.
 * Hàm hỗ trợ tạo QualityEvidenceId có thương hiệu.
 */
export declare function createQualityEvidenceId(id: string): QualityEvidenceId;
/**
 * Branded identifier for a continuous quality gate evaluation.
 * Định danh có thương hiệu cho một lượt đánh giá cổng chất lượng liên tục.
 */
export type QualityGateId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded QualityGateId.
 * Hàm hỗ trợ tạo QualityGateId có thương hiệu.
 */
export declare function createQualityGateId(id: string): QualityGateId;
/**
 * Command lifecycle stages distinguishing request from execution and authorization.
 * Các giai đoạn vòng đời lệnh phân biệt yêu cầu với thực thi và ủy quyền.
 */
export type CommandLifecycleStage = 'COMMAND_REQUEST' | 'COMMAND_VALIDATION' | 'COMMAND_EXECUTION' | 'COMMAND_RESULT' | 'COMMAND_VERIFICATION';
/**
 * Governed build execution states.
 * Các trạng thái thực thi bản dựng có quản trị.
 */
export type BuildExecutionState = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED' | 'BLOCKED' | 'REJECTED' | 'INTERRUPTED' | 'REVOKED' | 'INVALID';
/**
 * Discrete build milestones distinguishing status transitions.
 * Các mốc bản dựng riêng biệt phân biệt chuyển đổi trạng thái.
 */
export type BuildMilestone = 'BUILD_STARTED' | 'BUILD_COMPLETED' | 'BUILD_FAILED' | 'BUILD_VERIFIED';
/**
 * Governed test execution states.
 * Các trạng thái thực thi kiểm thử có quản trị.
 */
export type TestExecutionState = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'PARTIAL' | 'TIMEOUT' | 'CANCELLED' | 'BLOCKED' | 'REJECTED' | 'INTERRUPTED' | 'REVOKED' | 'INVALID';
/**
 * Continuous Quality Gate overall evaluation states.
 * Các trạng thái đánh giá tổng thể của Cổng Chất lượng Liên tục.
 */
export type QualityGateOverallState = 'PASS' | 'FAIL' | 'BLOCKED' | 'INCOMPLETE' | 'INVALID';
/**
 * Quality contradiction states.
 * Các trạng thái mâu thuẫn chất lượng.
 */
export type QualityContradictionState = 'CONSISTENT' | 'CONTRADICTED';
/**
 * Required quality stage categories evaluated by the Continuous Quality Gate.
 * Các danh mục giai đoạn chất lượng bắt buộc được đánh giá bởi Cổng Chất lượng Liên tục.
 */
export type QualityGateStageCategory = 'TYPECHECK' | 'BUILD' | 'DEDICATED_REALITY_GATE' | 'FULL_REGRESSION' | 'GIT_DIFF_CHECK' | 'SECURITY_SCAN' | 'PROCESS_AUDIT';
/**
 * Command categories permissible within the quality subsystem.
 * Các danh mục lệnh được phép trong hệ thống con chất lượng.
 */
export type QualityCommandType = 'BUILD' | 'TEST' | 'LINT' | 'SECURITY' | 'AUDIT';
/**
 * Execution context providing 8-tuple binding for every command.
 * Ngữ cảnh thực thi cung cấp liên kết bộ 8 thành phần cho mọi lệnh.
 */
export interface CommandExecutionContext {
    readonly taskId: string;
    readonly agentId: string;
    readonly delegationId: string;
    readonly capabilityLeaseId: string;
    readonly sessionId: string;
    readonly sandboxId: SandboxId;
    readonly worktreeId?: WorktreeId;
    readonly projectRoot: string;
}
/**
 * Raw output resulting from an in-sandbox governed command execution.
 * Đầu ra thô phát sinh từ một lượt thực thi lệnh có quản trị trong sandbox.
 */
export interface GovernedCommandRawResult {
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
    readonly durationMs: number;
    readonly timedOut: boolean;
    readonly interrupted: boolean;
    readonly artifactsProduced?: readonly string[];
}
/**
 * Registered governed command definition in allowlist.
 * Định nghĩa lệnh có quản trị đã đăng ký trong danh sách cho phép.
 */
export interface GovernedQualityCommand {
    readonly commandId: string;
    readonly commandType: QualityCommandType;
    readonly description: string;
    readonly allowedProjectRoots: readonly string[];
    readonly timeoutMs: number;
    readonly maxOutputSizeBytes?: number;
    readonly handler: (context: CommandExecutionContext) => Promise<GovernedCommandRawResult>;
}
/**
 * Normalized result of a governed build execution.
 * Kết quả chuẩn hóa của một lượt thực thi bản dựng có quản trị.
 */
export interface BuildExecutionResult {
    readonly executionId: BuildExecutionId;
    readonly commandId: string;
    readonly context: CommandExecutionContext;
    readonly state: BuildExecutionState;
    readonly milestone: BuildMilestone;
    readonly exitCode: number;
    readonly stdoutHash: string;
    readonly stderrHash: string;
    readonly durationMs: number;
    readonly buildEvidenceHash: string;
    readonly artifactHashes: Record<string, string>;
    readonly executedAt: number;
    readonly reason?: string;
}
/**
 * Normalized summary of a governed test execution.
 * Tóm tắt chuẩn hóa của một lượt thực thi kiểm thử có quản trị.
 */
export interface TestResultSummary {
    readonly suiteCount: number;
    readonly passedSuites: number;
    readonly failedSuites: number;
    readonly skippedSuites: number;
    readonly assertionCount?: number;
}
/**
 * Normalized result of a governed test suite execution.
 * Kết quả chuẩn hóa của một lượt thực thi bộ kiểm thử có quản trị.
 */
export interface TestExecutionResult {
    readonly executionId: TestExecutionId;
    readonly commandId: string;
    readonly context: CommandExecutionContext;
    readonly state: TestExecutionState;
    readonly exitCode: number;
    readonly summary: TestResultSummary;
    readonly stdoutHash: string;
    readonly stderrHash: string;
    readonly durationMs: number;
    readonly testEvidenceHash: string;
    readonly artifactHashes: Record<string, string>;
    readonly executedAt: number;
    readonly reason?: string;
}
/**
 * Aggregated quality evidence bundle tying all execution records together.
 * Gói bằng chứng chất lượng tổng hợp liên kết tất cả các bản ghi thực thi lại với nhau.
 */
export interface QualityEvidenceBundle {
    readonly evidenceId: QualityEvidenceId;
    readonly context: CommandExecutionContext;
    readonly manifestHash: string;
    readonly worktreeHash?: string;
    readonly buildResults: readonly BuildExecutionResult[];
    readonly testResults: readonly TestExecutionResult[];
    readonly securityScanResult?: {
        readonly passed: boolean;
        readonly prohibitedApisFound: number;
        readonly scanHash: string;
    };
    readonly evidenceHash: string;
    readonly createdAt: number;
}
/**
 * Evaluation record for an individual quality gate stage.
 * Bản ghi đánh giá cho một giai đoạn cổng chất lượng riêng lẻ.
 */
export interface QualityGateStageEvaluation {
    readonly category: QualityGateStageCategory;
    readonly state: QualityGateOverallState;
    readonly commandId?: string;
    readonly durationMs: number;
    readonly details: string;
    readonly evidenceHash?: string;
}
/**
 * Overall Continuous Quality Gate evaluation output.
 * Đầu ra đánh giá tổng thể của Cổng Chất lượng Liên tục.
 */
export interface QualityGateEvaluation {
    readonly gateId: QualityGateId;
    readonly context: CommandExecutionContext;
    readonly overallState: QualityGateOverallState;
    readonly stages: readonly QualityGateStageEvaluation[];
    readonly evaluatedAt: number;
    readonly evaluationHash: string;
    readonly isPassed: boolean;
    readonly blockingReasons: readonly string[];
}
/**
 * Complete, cryptographically signed Quality Verification Report.
 * Báo cáo Xác minh Chất lượng hoàn chỉnh, có chữ ký mã hóa.
 */
export interface QualityVerificationReport {
    readonly reportId: QualityReportId;
    readonly evidenceId: QualityEvidenceId;
    readonly gateId: QualityGateId;
    readonly context: CommandExecutionContext;
    readonly overallState: QualityGateOverallState;
    readonly contradictionState: QualityContradictionState;
    readonly buildSummary: {
        readonly total: number;
        readonly passed: number;
        readonly failed: number;
    };
    readonly testSummary: {
        readonly totalSuites: number;
        readonly passedSuites: number;
        readonly failedSuites: number;
        readonly totalAssertions?: number;
    };
    readonly manifestHash: string;
    readonly evidenceHash: string;
    readonly gateEvaluationHash: string;
    readonly reportHash: string;
    readonly issuedAt: number;
    readonly failureReasons: readonly string[];
    readonly blockingReasons: readonly string[];
}
/**
 * Conflict record representing a contradiction between multiple agent quality evaluations.
 * Bản ghi xung đột đại diện cho mâu thuẫn giữa các đánh giá chất lượng của nhiều agent.
 */
export interface QualityContradictionRecord {
    readonly contradictionId: string;
    readonly category: QualityGateStageCategory | 'BUILD' | 'TEST';
    readonly conflictingResults: readonly {
        readonly agentId: string;
        readonly executionId: string;
        readonly state: string;
        readonly evidenceHash: string;
        readonly timestamp: number;
    }[];
    readonly detectedAt: number;
    readonly details: string;
}
/**
 * Error code enum for quality subsystem errors.
 * Mã lỗi chuẩn cho các lỗi thuộc hệ thống con chất lượng.
 */
export declare enum QualityErrorCode {
    PROTECTED_WORKSPACE_VIOLATION = "PROTECTED_WORKSPACE_VIOLATION",
    PATH_TRAVERSAL_VIOLATION = "PATH_TRAVERSAL_VIOLATION",
    COMMAND_NOT_ALLOWLISTED = "COMMAND_NOT_ALLOWLISTED",
    SANDBOX_NOT_FOUND = "SANDBOX_NOT_FOUND",
    WORKTREE_NOT_FOUND = "WORKTREE_NOT_FOUND",
    SESSION_MISMATCH = "SESSION_MISMATCH",
    TASK_MISMATCH = "TASK_MISMATCH",
    DELEGATION_INVALID = "DELEGATION_INVALID",
    CAPABILITY_LEASE_INVALID = "CAPABILITY_LEASE_INVALID",
    USER_STOP_ACTIVE = "USER_STOP_ACTIVE",
    REVOCATION_ACTIVE = "REVOCATION_ACTIVE",
    TIMEOUT_EXCEEDED = "TIMEOUT_EXCEEDED",
    COMMAND_EXECUTION_FAILED = "COMMAND_EXECUTION_FAILED",
    EVIDENCE_CORRUPTED = "EVIDENCE_CORRUPTED",
    MANIFEST_HASH_MISMATCH = "MANIFEST_HASH_MISMATCH",
    STALE_WORKTREE = "STALE_WORKTREE",
    CONTRADICTION_DETECTED = "CONTRADICTION_DETECTED",
    PROMOTION_AUTHORIZATION_ATTEMPT = "PROMOTION_AUTHORIZATION_ATTEMPT",
    CREDENTIAL_PERSISTENCE_ATTEMPT = "CREDENTIAL_PERSISTENCE_ATTEMPT",
    RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED"
}
/**
 * Branded error class for all Quality subsystem failures.
 * Lớp lỗi có thương hiệu cho tất cả các sự cố của hệ thống con Chất lượng.
 */
export declare class QualityError extends Error {
    readonly code: QualityErrorCode;
    readonly timestamp: number;
    constructor(code: QualityErrorCode, message: string);
}
