// src/core/incidentResilience/hypothesisAccuracyScorer.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Governed Hypothesis Outcome Calibration & Accuracy Scorer.
// Correlates pre-remediation root-cause hypotheses with verified post-mitigation outcomes.
// Classifies hypotheses as SUPPORTED, PARTIALLY_SUPPORTED, REFUTED, or INCONCLUSIVE without mutating original confidence.
// Động cơ hiệu chuẩn kết quả & chấm điểm độ chính xác của giả thuyết có quản trị.
// Tương quan các giả thuyết nguyên nhân gốc trước khắc phục với các kết quả sau khắc phục đã xác minh.
// Phân loại các giả thuyết thành SUPPORTED, PARTIALLY_SUPPORTED, REFUTED, hoặc INCONCLUSIVE mà không làm biến đổi độ tin cậy gốc.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - CONFIDENCE != AUTHORITY: High hypothesis confidence NEVER confers execution permission.
// - EPISTEMIC HUMILITY: Successful remediation is NOT absolute proof of causality (preserves uncertainty).
// - NEVER MUTATE ORIGINAL CONFIDENCE: Emits a separate historical calibration record; leaves diagnostic data immutable.
// - INCONCLUSIVE on ambiguity: Missing verification or contradicted actions must resolve to INCONCLUSIVE.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export class HypothesisAccuracyScorer {
    /**
     * Evaluates diagnostic hypothesis accuracy against verified remediation outcomes.
     * Đánh giá độ chính xác của giả thuyết chẩn đoán dựa trên kết quả khắc phục đã xác minh.
     */
    scoreHypothesis(input) {
        const { hypothesis, actionClass, verificationResult, rollbackResult, hasContradictoryEvidence = false, } = input;
        const evaluatedAt = Date.now();
        // Ambiguity / missing verification / contradictions lead to INCONCLUSIVE
        // Sự mơ hồ / thiếu xác minh / mâu thuẫn dẫn đến INCONCLUSIVE
        if (!verificationResult && !rollbackResult) {
            return Object.freeze({
                hypothesisId: hypothesis.hypothesisId,
                originalConfidence: hypothesis.confidenceScore,
                originalUncertainty: hypothesis.uncertaintyScore,
                classification: 'INCONCLUSIVE',
                calibrationWeight: 0.5,
                justification: 'No post-mitigation verification or rollback result available to calibrate hypothesis.',
                evaluatedAt,
            });
        }
        if (hasContradictoryEvidence) {
            return Object.freeze({
                hypothesisId: hypothesis.hypothesisId,
                originalConfidence: hypothesis.confidenceScore,
                originalUncertainty: hypothesis.uncertaintyScore,
                classification: 'INCONCLUSIVE',
                calibrationWeight: 0.4,
                justification: 'Contradictory multi-agent evidence present; cannot deterministically calibrate causality.',
                evaluatedAt,
            });
        }
        // Rollback occurred -> The targeted remediation failed to resolve the failure or aggravated it
        // Khôi phục đã xảy ra -> Hành động khắc phục mục tiêu không giải quyết được lỗi hoặc làm trầm trọng thêm
        if (rollbackResult && rollbackResult.success) {
            return Object.freeze({
                hypothesisId: hypothesis.hypothesisId,
                originalConfidence: hypothesis.confidenceScore,
                originalUncertainty: hypothesis.uncertaintyScore,
                classification: 'REFUTED',
                calibrationWeight: 0.2,
                justification: `Remediation executed based on hypothesis failed verification and was rolled back (${rollbackResult.reason}).`,
                evaluatedAt,
            });
        }
        // Verification passed
        // Xác minh thành công
        const isVerified = Boolean(verificationResult && (verificationResult.verified || verificationResult.passed));
        if (isVerified) {
            // Check if action was well aligned with hypothesis category
            // Kiểm tra xem hành động có liên kết chặt chẽ với phân loại của giả thuyết không
            const isCategoryAligned = this.isActionCategoryAligned(hypothesis.category, actionClass);
            if (isCategoryAligned && verificationResult && verificationResult.newInvariantViolationsCount === 0) {
                return Object.freeze({
                    hypothesisId: hypothesis.hypothesisId,
                    originalConfidence: hypothesis.confidenceScore,
                    originalUncertainty: hypothesis.uncertaintyScore,
                    classification: 'SUPPORTED',
                    calibrationWeight: 0.9,
                    justification: `Post-mitigation verification succeeded with zero invariant violations; action aligned with hypothesis category ${hypothesis.category}.`,
                    evaluatedAt,
                });
            }
            else {
                return Object.freeze({
                    hypothesisId: hypothesis.hypothesisId,
                    originalConfidence: hypothesis.confidenceScore,
                    originalUncertainty: hypothesis.uncertaintyScore,
                    classification: 'PARTIALLY_SUPPORTED',
                    calibrationWeight: 0.7,
                    justification: `Post-mitigation verification succeeded, but minor side-effects or loose action category mapping observed.`,
                    evaluatedAt,
                });
            }
        }
        // Verification failed without rollback completed
        // Xác minh thất bại mà chưa hoàn thành khôi phục
        return Object.freeze({
            hypothesisId: hypothesis.hypothesisId,
            originalConfidence: hypothesis.confidenceScore,
            originalUncertainty: hypothesis.uncertaintyScore,
            classification: 'REFUTED',
            calibrationWeight: 0.1,
            justification: 'Remediation verification failed to confirm system stabilization.',
            evaluatedAt,
        });
    }
    isActionCategoryAligned(category, actionClass) {
        if (!actionClass)
            return false;
        switch (category) {
            case 'PROCESS_CORRUPTION':
                return actionClass === 'PROCESS_RESTART';
            case 'CONFIG_CORRUPTION':
                return actionClass === 'CONFIG_SYNC';
            case 'DEPLOYMENT_DEFECT':
                return actionClass === 'ROLLBACK';
            case 'RESOURCE_EXHAUSTION':
                return actionClass === 'TRAFFIC_DRAIN' || actionClass === 'PROCESS_RESTART';
            default:
                return true;
        }
    }
}
