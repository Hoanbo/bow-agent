// src/core/deployment/deploymentContradictionEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Multi-agent contradiction detection engine rejecting majority voting and preserving conflicting evidence.
// Động cơ phát hiện mâu thuẫn đa tác nhân bác bỏ bỏ phiếu đa số và bảo toàn bằng chứng xung đột.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - AGENT_COUNT != AUTHORITY_COUNT (No majority voting).
// - Contradictions fail closed into CONFLICTED state.
// - All conflicting evidence preserved verbatim and escalated to SupervisorHumanGate.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class DeploymentContradictionEngine {
    contradictions = new Map();
    /**
     * Analyzes multiple agent assertions for conflicting statuses, scores, or evidence.
     * Phân tích nhiều khẳng định của tác nhân để tìm các trạng thái, điểm số hoặc bằng chứng xung đột.
     */
    detectContradictions(deploymentId, ringLevel, assertions) {
        if (assertions.length <= 1) {
            return null;
        }
        const conflictingFields = [];
        const firstStatus = assertions[0].reportedStatus;
        const firstScore = assertions[0].reportedHealthScore;
        let hasStatusConflict = false;
        let hasScoreConflict = false;
        for (let i = 1; i < assertions.length; i++) {
            if (assertions[i].reportedStatus !== firstStatus) {
                hasStatusConflict = true;
            }
            // Difference greater than 10 points is considered a significant discrepancy.
            // Chênh lệch lớn hơn 10 điểm được coi là một sự khác biệt đáng kể.
            if (Math.abs(assertions[i].reportedHealthScore - firstScore) > 10) {
                hasScoreConflict = true;
            }
        }
        if (hasStatusConflict)
            conflictingFields.push('reportedStatus');
        if (hasScoreConflict)
            conflictingFields.push('reportedHealthScore');
        if (conflictingFields.length === 0) {
            return null;
        }
        const contradictionRecord = {
            contradictionId: `contra_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            deploymentId,
            ringLevel,
            assertions,
            conflictingFields,
            detectedAt: Date.now(),
            escalatedToHumanGate: true,
        };
        const list = this.contradictions.get(deploymentId) ?? [];
        list.push(contradictionRecord);
        this.contradictions.set(deploymentId, list);
        return contradictionRecord;
    }
    /**
     * Retrieves all contradiction records for a deployment.
     * Lấy tất cả các bản ghi mâu thuẫn cho một đợt triển khai.
     */
    getContradictions(deploymentId) {
        return this.contradictions.get(deploymentId) ?? [];
    }
}
