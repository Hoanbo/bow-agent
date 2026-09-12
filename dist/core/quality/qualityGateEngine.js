// src/core/quality/qualityGateEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Continuous Quality Gate evaluating Typecheck, Build, Reality Gate, Full Regression, Git Diff, Security, and Process audits.
// Cổng Chất lượng Liên tục đánh giá Typecheck, Build, Reality Gate, Hồi quy toàn diện, Git Diff, Bảo mật và Kiểm toán tiến trình.
//
// STRICT INVARIANTS:
// - QUALITY_PASS != PROMOTION_AUTHORIZATION
// - QUALITY_RESULT != AUTHORITY
// - MISSING OR UNVERIFIABLE SIGNAL MUST NEVER SILENTLY BECOME PASS.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createQualityGateId, } from './qualityTypes.js';
import { GovernedExecutionEngine } from './governedExecutionEngine.js';
export const MANDATORY_QUALITY_GATE_STAGES = [
    'TYPECHECK',
    'BUILD',
    'DEDICATED_REALITY_GATE',
    'FULL_REGRESSION',
    'GIT_DIFF_CHECK',
    'SECURITY_SCAN',
    'PROCESS_AUDIT',
];
export class QualityGateEngine {
    executionEngine;
    constructor(executionEngine = new GovernedExecutionEngine()) {
        this.executionEngine = executionEngine;
    }
    /**
     * Computes deterministic SHA-256 hash representing a continuous quality gate evaluation.
     * Tính toán mã băm SHA-256 tất định đại diện cho một lượt đánh giá cổng chất lượng liên tục.
     */
    static hashGateEvaluation(gateId, overallState, stageHashes) {
        const payload = `${gateId}:${overallState}:${stageHashes.join(';')}`;
        return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    }
    /**
     * Maps a quality gate category to its registered command ID.
     * Ánh xạ một danh mục cổng chất lượng sang ID lệnh đã đăng ký.
     */
    static mapCategoryToCommandId(category) {
        switch (category) {
            case 'TYPECHECK':
                return 'npm_run_typecheck';
            case 'BUILD':
                return 'npm_run_build';
            case 'DEDICATED_REALITY_GATE':
                return 'reality_gate';
            case 'FULL_REGRESSION':
                return 'full_regression';
            case 'GIT_DIFF_CHECK':
                return 'git_diff_check';
            case 'SECURITY_SCAN':
                return 'security_scan';
            case 'PROCESS_AUDIT':
                return 'process_audit';
        }
    }
    /**
     * Evaluates all continuous quality gate stages within an isolated sandbox.
     * Đánh giá tất cả các giai đoạn cổng chất lượng liên tục bên trong sandbox cô lập.
     */
    async evaluateGate(context, sandbox, options) {
        const gateId = createQualityGateId(`qgate_${crypto.randomUUID()}`);
        const evaluatedAt = Date.now();
        const stagesToRun = options?.stagesToRun ?? MANDATORY_QUALITY_GATE_STAGES;
        const stageEvaluations = [];
        const blockingReasons = [];
        // Evaluate stages sequentially in sandbox
        // Đánh giá các giai đoạn tuần tự trong sandbox
        for (const category of stagesToRun) {
            const commandId = QualityGateEngine.mapCategoryToCommandId(category);
            try {
                const executed = await this.executionEngine.executeCommand(commandId, context, sandbox, options);
                let stageState;
                if (executed.timedOut) {
                    stageState = 'FAIL';
                    blockingReasons.push(`Stage ${category} (${commandId}) timed out.`);
                }
                else if (executed.interrupted) {
                    stageState = 'BLOCKED';
                    blockingReasons.push(`Stage ${category} (${commandId}) was interrupted by USER_STOP.`);
                }
                else if (executed.exitCode === 0) {
                    stageState = 'PASS';
                }
                else {
                    stageState = 'FAIL';
                    blockingReasons.push(`Stage ${category} (${commandId}) failed with exit code ${executed.exitCode}.`);
                }
                stageEvaluations.push({
                    category,
                    state: stageState,
                    commandId,
                    durationMs: executed.durationMs,
                    details: stageState === 'PASS' ? 'Executed cleanly.' : executed.stderr || `Exit code ${executed.exitCode}`,
                    evidenceHash: executed.rawEvidenceHash,
                });
            }
            catch (err) {
                stageEvaluations.push({
                    category,
                    state: 'FAIL',
                    commandId,
                    durationMs: 0,
                    details: err.message || 'Execution exception occurred.',
                });
                blockingReasons.push(`Stage ${category} exception: ${err.message}`);
            }
        }
        // Determine overall state
        // Xác định trạng thái tổng thể
        let overallState = 'PASS';
        if (stagesToRun.length < MANDATORY_QUALITY_GATE_STAGES.length) {
            overallState = 'INCOMPLETE';
            blockingReasons.push('Gate evaluation does not contain all mandatory stages.');
        }
        else if (stageEvaluations.some((s) => s.state === 'BLOCKED')) {
            overallState = 'BLOCKED';
        }
        else if (stageEvaluations.some((s) => s.state === 'FAIL')) {
            overallState = 'FAIL';
        }
        else if (stageEvaluations.some((s) => s.state === 'INVALID')) {
            overallState = 'INVALID';
        }
        const stageHashes = stageEvaluations.map((s) => `${s.category}:${s.state}:${s.evidenceHash ?? ''}`);
        const evaluationHash = QualityGateEngine.hashGateEvaluation(gateId, overallState, stageHashes);
        return Object.freeze({
            gateId,
            context: Object.freeze({ ...context }),
            overallState,
            stages: Object.freeze(stageEvaluations),
            evaluatedAt,
            evaluationHash,
            isPassed: overallState === 'PASS',
            blockingReasons: Object.freeze(blockingReasons),
        });
    }
}
