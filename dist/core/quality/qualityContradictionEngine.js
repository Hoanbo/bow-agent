// src/core/quality/qualityContradictionEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Governed contradiction engine detecting conflicting quality signals without majority voting.
// Động cơ mâu thuẫn có quản trị phát hiện các tín hiệu chất lượng xung đột mà không dùng bỏ phiếu đa số.
//
// STRICT INVARIANTS:
// - AGENT_COUNT != AUTHORITY_COUNT
// - NO MAJORITY VOTING (Contradictions must not be resolved by agent majority).
// - NO ARBITRARY AGENT PREFERENCE.
// - CONTRADICTIONS MUST REMAIN VISIBLE FOR SUPERVISORY RESOLUTION.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class QualityContradictionEngine {
    contradictionRecords = [];
    /**
     * Compares two or more build execution results for conflicting outcomes.
     * So sánh hai hoặc nhiều kết quả thực thi bản dựng để tìm kết quả xung đột.
     */
    detectBuildContradictions(results) {
        const detected = [];
        if (results.length < 2)
            return detected;
        const states = new Set(results.map((r) => r.state));
        if (states.size > 1) {
            const record = {
                contradictionId: `contra_build_${crypto.randomUUID()}`,
                category: 'BUILD',
                conflictingResults: results.map((r) => ({
                    agentId: r.context.agentId,
                    executionId: r.executionId,
                    state: r.state,
                    evidenceHash: r.buildEvidenceHash,
                    timestamp: r.executedAt,
                })),
                detectedAt: Date.now(),
                details: `Conflicting build execution states detected across agents: [${Array.from(states).join(', ')}]. Majority voting rejected.`,
            };
            detected.push(record);
            this.contradictionRecords.push(record);
        }
        return Object.freeze(detected);
    }
    /**
     * Compares two or more test execution results for conflicting outcomes.
     * So sánh hai hoặc nhiều kết quả thực thi kiểm thử để tìm kết quả xung đột.
     */
    detectTestContradictions(results) {
        const detected = [];
        if (results.length < 2)
            return detected;
        const states = new Set(results.map((r) => r.state));
        if (states.size > 1) {
            const record = {
                contradictionId: `contra_test_${crypto.randomUUID()}`,
                category: 'TEST',
                conflictingResults: results.map((r) => ({
                    agentId: r.context.agentId,
                    executionId: r.executionId,
                    state: r.state,
                    evidenceHash: r.testEvidenceHash,
                    timestamp: r.executedAt,
                })),
                detectedAt: Date.now(),
                details: `Conflicting test execution states detected across agents: [${Array.from(states).join(', ')}]. Majority voting rejected.`,
            };
            detected.push(record);
            this.contradictionRecords.push(record);
        }
        return Object.freeze(detected);
    }
    /**
     * Compares two or more gate evaluations for conflicting overall outcomes.
     * So sánh hai hoặc nhiều đánh giá cổng để tìm kết quả tổng thể xung đột.
     */
    detectGateContradictions(evaluations) {
        const detected = [];
        if (evaluations.length < 2)
            return detected;
        const states = new Set(evaluations.map((e) => e.overallState));
        if (states.size > 1) {
            const record = {
                contradictionId: `contra_gate_${crypto.randomUUID()}`,
                category: 'DEDICATED_REALITY_GATE',
                conflictingResults: evaluations.map((e) => ({
                    agentId: e.context.agentId,
                    executionId: e.gateId,
                    state: e.overallState,
                    evidenceHash: e.evaluationHash,
                    timestamp: e.evaluatedAt,
                })),
                detectedAt: Date.now(),
                details: `Conflicting gate evaluation states detected across agents: [${Array.from(states).join(', ')}]. Majority voting rejected.`,
            };
            detected.push(record);
            this.contradictionRecords.push(record);
        }
        return Object.freeze(detected);
    }
    /**
     * Returns all recorded contradiction records.
     * Trả về tất cả các bản ghi mâu thuẫn đã ghi nhận.
     */
    getRecordedContradictions() {
        return Object.freeze([...this.contradictionRecords]);
    }
}
