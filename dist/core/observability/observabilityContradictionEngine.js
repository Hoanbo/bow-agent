// src/core/observability/observabilityContradictionEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Multi-agent contradiction detection engine rejecting majority voting and preserving conflicting evidence.
// Động cơ phát hiện mâu thuẫn đa tác nhân bác bỏ bỏ phiếu đa số và bảo toàn bằng chứng xung đột.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - AGENT_COUNT != AUTHORITY_COUNT: Discrepant sources are NEVER resolved by vote.
// - Contradictions are preserved verbatim and escalated to SupervisorHumanGate.
// - Purely observational; no execution authority invented.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class ObservabilityContradictionEngine {
    contradictions = new Map();
    /**
     * Analyzes multiple observational agent assertions for conflicting health states, scores, or drift classifications.
     * Phân tích nhiều khẳng định của tác nhân quan sát để tìm trạng thái sức khỏe, điểm số hoặc phân loại sai lệch xung đột.
     */
    detectContradictions(sessionId, targetId, assertions) {
        if (assertions.length <= 1) {
            return null;
        }
        const conflictingFields = [];
        const firstState = assertions[0].reportedHealthState;
        const firstScore = assertions[0].reportedHealthScore;
        const firstDrift = assertions[0].reportedDriftClassification;
        let hasStateConflict = false;
        let hasScoreConflict = false;
        let hasDriftConflict = false;
        for (let i = 1; i < assertions.length; i++) {
            if (assertions[i].reportedHealthState !== firstState) {
                hasStateConflict = true;
            }
            // Score discrepancy > 10 points is a conflict
            // Chênh lệch điểm > 10 điểm là một xung đột
            if (Math.abs(assertions[i].reportedHealthScore - firstScore) > 10) {
                hasScoreConflict = true;
            }
            if (assertions[i].reportedDriftClassification !== firstDrift) {
                hasDriftConflict = true;
            }
        }
        if (hasStateConflict)
            conflictingFields.push('reportedHealthState');
        if (hasScoreConflict)
            conflictingFields.push('reportedHealthScore');
        if (hasDriftConflict)
            conflictingFields.push('reportedDriftClassification');
        if (conflictingFields.length === 0) {
            return null;
        }
        const contradictionRecord = {
            contradictionId: `contra_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            sessionId,
            targetId,
            assertions,
            conflictingFields,
            status: 'CONFLICT_ESCALATED',
            detectedAt: Date.now(),
            escalatedToSupervisor: true,
        };
        const sessionList = this.contradictions.get(sessionId) ?? [];
        sessionList.push(contradictionRecord);
        this.contradictions.set(sessionId, sessionList);
        return contradictionRecord;
    }
    /**
     * Retrieves all contradiction records for an observability session.
     * Lấy tất cả các bản ghi mâu thuẫn cho một phiên quan sát.
     */
    getContradictions(sessionId) {
        return this.contradictions.get(sessionId) ?? [];
    }
    /**
     * Clears in-memory contradictions.
     * Xóa các mâu thuẫn trong bộ nhớ.
     */
    clear(sessionId) {
        if (sessionId) {
            this.contradictions.delete(sessionId);
        }
        else {
            this.contradictions.clear();
        }
    }
}
