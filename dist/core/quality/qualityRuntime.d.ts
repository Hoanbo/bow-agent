import { type BuildExecutionResult, type TestExecutionResult, type QualityEvidenceBundle, type QualityGateEvaluation, type QualityVerificationReport, type CommandExecutionContext, type QualityContradictionRecord, type QualityEvidenceId, type QualityReportId } from './qualityTypes.js';
import { QualityCommandRegistry } from './qualityCommandRegistry.js';
import { GovernedExecutionEngine } from './governedExecutionEngine.js';
import { BuildExecutionEngine } from './buildExecutionEngine.js';
import { TestExecutionEngine } from './testExecutionEngine.js';
import { QualityEvidenceEngine } from './qualityEvidenceEngine.js';
import { QualityVerificationEngine, type QualityVerificationResult } from './qualityVerificationEngine.js';
import { QualityContradictionEngine } from './qualityContradictionEngine.js';
import { QualityGateEngine } from './qualityGateEngine.js';
import { QualityReportEngine } from './qualityReportEngine.js';
import type { SandboxDescriptor, SandboxManifest } from '../sandbox/sandboxTypes.js';
import { AuditLedger } from '../auditLedger.js';
export declare class QualityRuntime {
    private readonly auditLedger;
    readonly commandRegistry: QualityCommandRegistry;
    readonly executionEngine: GovernedExecutionEngine;
    readonly buildEngine: BuildExecutionEngine;
    readonly testEngine: TestExecutionEngine;
    readonly evidenceEngine: QualityEvidenceEngine;
    readonly verificationEngine: QualityVerificationEngine;
    readonly contradictionEngine: QualityContradictionEngine;
    readonly gateEngine: QualityGateEngine;
    readonly reportEngine: QualityReportEngine;
    private readonly evidenceBundles;
    private readonly qualityReports;
    private _isUserStopped;
    private _userStopReason;
    constructor(auditLedger?: AuditLedger);
    /**
     * Logs an audit event to the canonical AuditLedger.
     * Ghi lại một sự kiện kiểm toán vào AuditLedger chuẩn tắc.
     */
    private logAudit;
    /**
     * Requests emergency USER_STOP, halting all quality operations immediately.
     * Yêu cầu dừng khẩn cấp USER_STOP, lập tức dừng mọi thao tác chất lượng.
     */
    requestUserStop(reason: string): void;
    /**
     * Authoritatively resets USER_STOP under Master Owner authority.
     * Thiết lập lại USER_STOP một cách có thẩm quyền dưới quyền Master Owner.
     */
    resetUserStop(): void;
    /**
     * Checks whether emergency USER_STOP is currently active.
     * Kiểm tra xem lệnh dừng khẩn cấp USER_STOP có đang kích hoạt hay không.
     */
    isUserStopped(): boolean;
    /**
     * Executes an in-sandbox governed build command.
     * Thực thi một lệnh dựng có quản trị bên trong sandbox.
     */
    runBuild(commandId: string, context: CommandExecutionContext, sandbox: SandboxDescriptor, options?: {
        readonly timeoutMs?: number;
        readonly isRevoked?: boolean;
    }): Promise<BuildExecutionResult>;
    /**
     * Executes an in-sandbox governed test suite command.
     * Thực thi một lệnh bộ kiểm thử có quản trị bên trong sandbox.
     */
    runTest(commandId: string, context: CommandExecutionContext, sandbox: SandboxDescriptor, options?: {
        readonly timeoutMs?: number;
        readonly isRevoked?: boolean;
    }): Promise<TestExecutionResult>;
    /**
     * Evaluates the Continuous Quality Gate across mandatory pipeline stages.
     * Đánh giá Cổng Chất lượng Liên tục qua các giai đoạn đường ống bắt buộc.
     */
    evaluateQualityGate(context: CommandExecutionContext, sandbox: SandboxDescriptor, options?: {
        readonly timeoutMs?: number;
        readonly isRevoked?: boolean;
    }): Promise<QualityGateEvaluation>;
    /**
     * Packages build and test results into an immutable QualityEvidenceBundle.
     * Đóng gói kết quả dựng và kiểm thử thành một QualityEvidenceBundle bất biến.
     */
    packageEvidenceBundle(context: CommandExecutionContext, manifestHash: string, buildResults: readonly BuildExecutionResult[], testResults: readonly TestExecutionResult[], securityScanResult?: {
        readonly passed: boolean;
        readonly prohibitedApisFound: number;
        readonly scanHash: string;
    }, worktreeHash?: string): QualityEvidenceBundle;
    /**
     * Verifies the integrity and freshness of a quality evidence bundle.
     * Xác minh tính toàn vẹn và độ tươi mới của một gói bằng chứng chất lượng.
     */
    verifyEvidence(bundle: QualityEvidenceBundle, sandbox: SandboxDescriptor, currentManifest: SandboxManifest): QualityVerificationResult;
    /**
     * Detects contradictions across multiple agent build/test results without majority voting.
     * Phát hiện mâu thuẫn giữa kết quả dựng/kiểm thử của nhiều agent mà không dùng bỏ phiếu đa số.
     */
    checkContradictions(buildResults?: readonly BuildExecutionResult[], testResults?: readonly TestExecutionResult[], gateEvaluations?: readonly QualityGateEvaluation[]): readonly QualityContradictionRecord[];
    /**
     * Compiles an authoritative QualityVerificationReport for supervisory review.
     * Biên soạn Báo cáo Xác minh Chất lượng có thẩm quyền phục vụ xem xét giám sát.
     */
    compileQualityReport(evidenceBundle: QualityEvidenceBundle, gateEvaluation: QualityGateEvaluation, contradictionRecords?: readonly QualityContradictionRecord[]): QualityVerificationReport;
    /**
     * Retrieves a stored quality report by ID.
     * Lấy báo cáo chất lượng đã lưu trữ theo ID.
     */
    getQualityReport(reportId: QualityReportId): QualityVerificationReport | undefined;
    /**
     * Retrieves a stored evidence bundle by ID.
     * Lấy gói bằng chứng đã lưu trữ theo ID.
     */
    getEvidenceBundle(evidenceId: QualityEvidenceId): QualityEvidenceBundle | undefined;
    /**
     * Clears in-memory runtime records.
     * Xóa sạch các bản ghi runtime trong bộ nhớ.
     */
    clear(): void;
}
export declare const globalQualityRuntime: QualityRuntime;
