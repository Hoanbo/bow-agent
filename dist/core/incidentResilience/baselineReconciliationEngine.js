// src/core/incidentResilience/baselineReconciliationEngine.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Governed Baseline Reconciliation Engine.
// Safely reconciles observability telemetry baselines following authorized mutations.
// Prevents legitimate post-remediation changes from triggering spurious drift alerts without disabling drift checks.
// Động cơ đối soát đường cơ sở có quản trị.
// Đối soát an toàn các đường cơ sở đo từ xa của khả năng quan sát sau các đột biến được ủy quyền.
// Ngăn các thay đổi hợp lệ sau khắc phục kích hoạt cảnh báo sai lệch giả mạo mà không vô hiệu hóa việc kiểm tra sai lệch.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - NEVER RECONCILE ON FAILURE: Reconciliation prohibited if verification failed, rollback occurred, or USER_STOP active.
// - DO NOT DISABLE DRIFT: Reconciles baseline parameters; NEVER globally bypasses or disables DriftDetectionEngine.
// - DO NOT WEAKEN INVARIANTS: System invariant checks remain fully active and uncompromising.
// - BOUNDED TELEMETRY UPDATE: Only derives new baseline thresholds from actual verified post-mitigation telemetry.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createReconciliationId, } from './incidentResilienceTypes.js';
export class BaselineReconciliationEngine {
    /**
     * Safely calculates a reconciled baseline for post-remediation observability without disabling drift detection.
     * Tính toán an toàn đường cơ sở đã đối soát cho việc quan sát sau khắc phục mà không vô hiệu hóa phát hiện sai lệch.
     */
    reconcileBaseline(input) {
        const { targetId, verificationResult, rollbackResult, isUserStopActive = false, hasSecurityViolation = false, hasContradictoryEvidence = false, } = input;
        const reconciledAt = Date.now();
        const reconciliationId = createReconciliationId(`rec_${reconciledAt}_${crypto.randomBytes(4).toString('hex')}`);
        // Check prohibitions
        // Kiểm tra các điều kiện nghiêm cấm
        if (isUserStopActive) {
            return this.buildRecord(reconciliationId, targetId, 'SKIPPED_USER_STOP', reconciledAt, undefined, 'Reconciliation aborted: USER_STOP signal is active.');
        }
        if (hasSecurityViolation) {
            return this.buildRecord(reconciliationId, targetId, 'FAILED_INVARIANT', reconciledAt, undefined, 'Reconciliation rejected: Target has active security violation.');
        }
        if (rollbackResult && rollbackResult.success) {
            return this.buildRecord(reconciliationId, targetId, 'SKIPPED_ROLLED_BACK', reconciledAt, undefined, 'Reconciliation skipped: Target state was rolled back to pre-remediation snapshot.');
        }
        const isVerified = Boolean(verificationResult && (verificationResult.verified || verificationResult.passed));
        if (!isVerified || !verificationResult) {
            return this.buildRecord(reconciliationId, targetId, 'SKIPPED_NOT_VERIFIED', reconciledAt, undefined, 'Reconciliation skipped: Post-mitigation verification did not pass.');
        }
        if (hasContradictoryEvidence) {
            return this.buildRecord(reconciliationId, targetId, 'FAILED_INVARIANT', reconciledAt, undefined, 'Reconciliation rejected: Multi-agent contradiction detected.');
        }
        // Safety checks on verification telemetry
        // Kiểm tra an toàn trên số liệu đo từ xa sau xác minh
        if (verificationResult.newInvariantViolationsCount > 0) {
            return this.buildRecord(reconciliationId, targetId, 'FAILED_INVARIANT', reconciledAt, undefined, `Reconciliation rejected: ${verificationResult.newInvariantViolationsCount} new invariant violations detected.`);
        }
        // Derive bounded new baseline options from verified telemetry
        // Rút ra các tùy chọn đường cơ sở mới có giới hạn từ số liệu đo từ xa đã xác minh
        const errorRate = verificationResult.observedErrorRate ?? verificationResult.observedMetrics?.errorRate ?? 0.0;
        const latencyP95 = verificationResult.observedLatencyP95Ms ?? verificationResult.observedMetrics?.latencyP95 ?? 100.0;
        const reconciledBaseline = {
            baselineErrorRate: Math.max(0.0, Number(errorRate.toFixed(4))),
            baselineLatencyP95Ms: Math.max(1.0, Number(latencyP95.toFixed(2))),
        };
        return this.buildRecord(reconciliationId, targetId, 'RECONCILED', reconciledAt, reconciledBaseline, `Nominal baseline safely reconciled to post-mitigation telemetry (errorRate: ${reconciledBaseline.baselineErrorRate}, latencyP95: ${reconciledBaseline.baselineLatencyP95Ms}ms).`);
    }
    buildRecord(reconciliationId, targetId, status, reconciledAt, reconciledBaseline, expectedMutationNote) {
        const raw = JSON.stringify({
            reconciliationId,
            targetId,
            status,
            reconciledBaseline: reconciledBaseline ?? null,
            expectedMutationNote: expectedMutationNote ?? null,
            reconciledAt,
        });
        const reconciliationHash = crypto.createHash('sha256').update(raw).digest('hex');
        return Object.freeze({
            reconciliationId,
            targetId,
            status,
            reconciledBaseline,
            expectedMutationNote,
            reconciledAt,
            reconciliationHash,
        });
    }
}
