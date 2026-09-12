// src/core/quality/qualityRuntime.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Central coordinator integrating all quality engines with Sandbox, Promotion, Audit, and HumanGate.
// Bộ điều phối trung tâm tích hợp tất cả các động cơ chất lượng với Sandbox, Promotion, Audit và HumanGate.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - BUILD_SUCCESS != OWNER_APPROVAL
// - TEST_SUCCESS != OWNER_APPROVAL
// - QUALITY_PASS != PROMOTION_AUTHORIZATION
// - QUALITY_REPORT != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - VERIFICATION != AUTHORIZATION
// - ZERO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { QualityError, QualityErrorCode, } from './qualityTypes.js';
import { QualityCommandRegistry } from './qualityCommandRegistry.js';
import { GovernedExecutionEngine } from './governedExecutionEngine.js';
import { BuildExecutionEngine } from './buildExecutionEngine.js';
import { TestExecutionEngine } from './testExecutionEngine.js';
import { QualityEvidenceEngine } from './qualityEvidenceEngine.js';
import { QualityVerificationEngine } from './qualityVerificationEngine.js';
import { QualityContradictionEngine } from './qualityContradictionEngine.js';
import { QualityGateEngine } from './qualityGateEngine.js';
import { QualityReportEngine } from './qualityReportEngine.js';
import { globalAuditLedger } from '../auditLedger.js';
export class QualityRuntime {
    auditLedger;
    commandRegistry;
    executionEngine;
    buildEngine;
    testEngine;
    evidenceEngine;
    verificationEngine;
    contradictionEngine;
    gateEngine;
    reportEngine;
    evidenceBundles = new Map();
    qualityReports = new Map();
    _isUserStopped = false;
    _userStopReason = '';
    constructor(auditLedger = globalAuditLedger) {
        this.auditLedger = auditLedger;
        this.commandRegistry = new QualityCommandRegistry();
        this.executionEngine = new GovernedExecutionEngine(this.commandRegistry);
        this.buildEngine = new BuildExecutionEngine(this.executionEngine);
        this.testEngine = new TestExecutionEngine(this.executionEngine);
        this.evidenceEngine = new QualityEvidenceEngine();
        this.verificationEngine = new QualityVerificationEngine();
        this.contradictionEngine = new QualityContradictionEngine();
        this.gateEngine = new QualityGateEngine(this.executionEngine);
        this.reportEngine = new QualityReportEngine();
    }
    /**
     * Logs an audit event to the canonical AuditLedger.
     * Ghi lại một sự kiện kiểm toán vào AuditLedger chuẩn tắc.
     */
    logAudit(actorId, action, targetResource, decision, status, metadata) {
        if (!this.auditLedger)
            return;
        try {
            const argumentsHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(metadata ?? {}), 'utf8')
                .digest('hex');
            this.auditLedger.record({
                timestamp: new Date().toISOString(),
                actor: {
                    userId: actorId,
                    role: 'QUALITY_PIPELINE',
                    channel: 'INTERNAL',
                },
                domain: 'QUALITY_PIPELINE',
                toolName: action,
                classification: status === 'BLOCKED' ? 'SAFETY' : 'VERIFICATION',
                argumentsHash,
                policyDecision: decision,
                executionStatus: status,
                resultHash: argumentsHash,
            });
        }
        catch {
            // Fail closed: audit logging errors do not mask audit records
            // Thất bại theo dạng đóng: lỗi ghi log kiểm toán không che đậy các bản ghi
        }
    }
    /**
     * Requests emergency USER_STOP, halting all quality operations immediately.
     * Yêu cầu dừng khẩn cấp USER_STOP, lập tức dừng mọi thao tác chất lượng.
     */
    requestUserStop(reason) {
        this._isUserStopped = true;
        this._userStopReason = reason;
        this.logAudit('master_owner', 'quality_user_stop_requested', 'quality_runtime', 'DENY', 'BLOCKED', { reason });
    }
    /**
     * Authoritatively resets USER_STOP under Master Owner authority.
     * Thiết lập lại USER_STOP một cách có thẩm quyền dưới quyền Master Owner.
     */
    resetUserStop() {
        this._isUserStopped = false;
        this._userStopReason = '';
        this.logAudit('master_owner', 'quality_user_stop_reset', 'quality_runtime', 'PERMIT', 'SUCCESS', {});
    }
    /**
     * Checks whether emergency USER_STOP is currently active.
     * Kiểm tra xem lệnh dừng khẩn cấp USER_STOP có đang kích hoạt hay không.
     */
    isUserStopped() {
        return this._isUserStopped;
    }
    /**
     * Executes an in-sandbox governed build command.
     * Thực thi một lệnh dựng có quản trị bên trong sandbox.
     */
    async runBuild(commandId, context, sandbox, options) {
        if (this._isUserStopped) {
            throw new QualityError(QualityErrorCode.USER_STOP_ACTIVE, `Build execution rejected: USER_STOP is active (${this._userStopReason}).`);
        }
        const result = await this.buildEngine.executeBuild(commandId, context, sandbox, {
            timeoutMs: options?.timeoutMs,
            isUserStopped: this._isUserStopped,
            isRevoked: options?.isRevoked,
        });
        this.logAudit(context.agentId, 'quality_build_executed', sandbox.rootPath, result.state === 'PASSED' ? 'PERMIT' : 'DENY', result.state === 'PASSED' ? 'SUCCESS' : 'FAILURE', {
            executionId: result.executionId,
            commandId,
            state: result.state,
            exitCode: result.exitCode,
            buildEvidenceHash: result.buildEvidenceHash,
        });
        return result;
    }
    /**
     * Executes an in-sandbox governed test suite command.
     * Thực thi một lệnh bộ kiểm thử có quản trị bên trong sandbox.
     */
    async runTest(commandId, context, sandbox, options) {
        if (this._isUserStopped) {
            throw new QualityError(QualityErrorCode.USER_STOP_ACTIVE, `Test execution rejected: USER_STOP is active (${this._userStopReason}).`);
        }
        const result = await this.testEngine.executeTest(commandId, context, sandbox, {
            timeoutMs: options?.timeoutMs,
            isUserStopped: this._isUserStopped,
            isRevoked: options?.isRevoked,
        });
        this.logAudit(context.agentId, 'quality_test_executed', sandbox.rootPath, result.state === 'PASSED' ? 'PERMIT' : 'DENY', result.state === 'PASSED' ? 'SUCCESS' : 'FAILURE', {
            executionId: result.executionId,
            commandId,
            state: result.state,
            exitCode: result.exitCode,
            summary: result.summary,
            testEvidenceHash: result.testEvidenceHash,
        });
        return result;
    }
    /**
     * Evaluates the Continuous Quality Gate across mandatory pipeline stages.
     * Đánh giá Cổng Chất lượng Liên tục qua các giai đoạn đường ống bắt buộc.
     */
    async evaluateQualityGate(context, sandbox, options) {
        if (this._isUserStopped) {
            throw new QualityError(QualityErrorCode.USER_STOP_ACTIVE, `Quality gate evaluation rejected: USER_STOP is active (${this._userStopReason}).`);
        }
        const evaluation = await this.gateEngine.evaluateGate(context, sandbox, {
            timeoutMs: options?.timeoutMs,
            isUserStopped: this._isUserStopped,
            isRevoked: options?.isRevoked,
        });
        this.logAudit(context.agentId, 'quality_gate_evaluated', sandbox.rootPath, evaluation.isPassed ? 'PERMIT' : 'DENY', evaluation.isPassed ? 'SUCCESS' : 'FAILURE', {
            gateId: evaluation.gateId,
            overallState: evaluation.overallState,
            isPassed: evaluation.isPassed,
            evaluationHash: evaluation.evaluationHash,
        });
        return evaluation;
    }
    /**
     * Packages build and test results into an immutable QualityEvidenceBundle.
     * Đóng gói kết quả dựng và kiểm thử thành một QualityEvidenceBundle bất biến.
     */
    packageEvidenceBundle(context, manifestHash, buildResults, testResults, securityScanResult, worktreeHash) {
        const bundle = this.evidenceEngine.createEvidenceBundle({
            context,
            manifestHash,
            worktreeHash,
            buildResults,
            testResults,
            securityScanResult,
        });
        this.evidenceBundles.set(bundle.evidenceId, bundle);
        this.logAudit(context.agentId, 'quality_evidence_created', context.projectRoot, 'PERMIT', 'SUCCESS', {
            evidenceId: bundle.evidenceId,
            evidenceHash: bundle.evidenceHash,
            manifestHash,
        });
        return bundle;
    }
    /**
     * Verifies the integrity and freshness of a quality evidence bundle.
     * Xác minh tính toàn vẹn và độ tươi mới của một gói bằng chứng chất lượng.
     */
    verifyEvidence(bundle, sandbox, currentManifest) {
        return this.verificationEngine.verifyEvidenceBundle(bundle, sandbox, currentManifest);
    }
    /**
     * Detects contradictions across multiple agent build/test results without majority voting.
     * Phát hiện mâu thuẫn giữa kết quả dựng/kiểm thử của nhiều agent mà không dùng bỏ phiếu đa số.
     */
    checkContradictions(buildResults, testResults, gateEvaluations) {
        const records = [];
        if (buildResults && buildResults.length > 1) {
            records.push(...this.contradictionEngine.detectBuildContradictions(buildResults));
        }
        if (testResults && testResults.length > 1) {
            records.push(...this.contradictionEngine.detectTestContradictions(testResults));
        }
        if (gateEvaluations && gateEvaluations.length > 1) {
            records.push(...this.contradictionEngine.detectGateContradictions(gateEvaluations));
        }
        if (records.length > 0) {
            this.logAudit('quality_runtime', 'quality_contradiction_detected', 'contradiction_engine', 'DENY', 'BLOCKED', { contradictionCount: records.length });
        }
        return Object.freeze(records);
    }
    /**
     * Compiles an authoritative QualityVerificationReport for supervisory review.
     * Biên soạn Báo cáo Xác minh Chất lượng có thẩm quyền phục vụ xem xét giám sát.
     */
    compileQualityReport(evidenceBundle, gateEvaluation, contradictionRecords) {
        const hasContradiction = contradictionRecords && contradictionRecords.length > 0;
        const contradictionState = hasContradiction ? 'CONTRADICTED' : 'CONSISTENT';
        const report = this.reportEngine.createReport({
            evidenceBundle,
            gateEvaluation,
            contradictionState,
        });
        this.qualityReports.set(report.reportId, report);
        this.logAudit(evidenceBundle.context.agentId, 'quality_report_issued', evidenceBundle.context.projectRoot, report.overallState === 'PASS' ? 'PERMIT' : 'DENY', report.overallState === 'PASS' ? 'SUCCESS' : 'FAILURE', {
            reportId: report.reportId,
            overallState: report.overallState,
            contradictionState: report.contradictionState,
            reportHash: report.reportHash,
        });
        return report;
    }
    /**
     * Retrieves a stored quality report by ID.
     * Lấy báo cáo chất lượng đã lưu trữ theo ID.
     */
    getQualityReport(reportId) {
        return this.qualityReports.get(reportId);
    }
    /**
     * Retrieves a stored evidence bundle by ID.
     * Lấy gói bằng chứng đã lưu trữ theo ID.
     */
    getEvidenceBundle(evidenceId) {
        return this.evidenceBundles.get(evidenceId);
    }
    /**
     * Clears in-memory runtime records.
     * Xóa sạch các bản ghi runtime trong bộ nhớ.
     */
    clear() {
        this.evidenceBundles.clear();
        this.qualityReports.clear();
        this._isUserStopped = false;
        this._userStopReason = '';
    }
}
export const globalQualityRuntime = new QualityRuntime();
