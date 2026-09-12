// src/core/crossIncident/hypothesisReliabilityLedger.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Governed historical diagnostic hypothesis reliability ledger.
// Evaluates cumulative hypothesis outcomes across incidents using the mathematical formula:
// Reliability = (SUPPORTED + 0.5 * PARTIALLY_SUPPORTED) / (SUPPORTED + PARTIALLY_SUPPORTED + REFUTED)
// INCONCLUSIVE outcomes are strictly excluded from the denominator.
// Enforces the N >= 3 publication threshold; when N < 3, status is INSUFFICIENT_SAMPLE_SIZE.
// Sổ cái độ tin cậy giả thuyết chẩn đoán lịch sử có quản trị.
// Đánh giá kết quả giả thuyết tích lũy qua các sự cố sử dụng công thức toán học chuẩn.
// Kết quả INCONCLUSIVE bị loại trừ nghiêm ngặt khỏi mẫu số.
// Thực thi ngưỡng công bố N >= 3; khi N < 3, trạng thái là INSUFFICIENT_SAMPLE_SIZE.
export class HypothesisReliabilityLedger {
    static MINIMUM_PUBLICATION_SAMPLE_SIZE = 3;
    // In-memory accumulation table: hypothesisType -> counts
    ledger = new Map();
    /**
     * Records a single hypothesis outcome into the historical ledger.
     * Ghi nhận một kết quả giả thuyết vào sổ cái lịch sử.
     */
    recordOutcome(hypothesisType, outcome) {
        if (!hypothesisType || typeof hypothesisType !== 'string') {
            throw new Error('INVALID_HYPOTHESIS_TYPE: hypothesisType must be a non-empty string');
        }
        const current = this.ledger.get(hypothesisType) ?? {
            supported: 0,
            partiallySupported: 0,
            refuted: 0,
            inconclusive: 0,
        };
        switch (outcome) {
            case 'SUPPORTED':
                current.supported++;
                break;
            case 'PARTIALLY_SUPPORTED':
                current.partiallySupported++;
                break;
            case 'REFUTED':
                current.refuted++;
                break;
            case 'INCONCLUSIVE':
                current.inconclusive++;
                break;
            default:
                throw new Error(`UNKNOWN_HYPOTHESIS_OUTCOME: ${outcome}`);
        }
        this.ledger.set(hypothesisType, current);
    }
    /**
     * Ingests hypothesis accuracy records from a collection of archived incidents dynamically.
     * Nhập các bản ghi độ chính xác giả thuyết từ tập hợp các sự cố đã lưu trữ một cách linh hoạt.
     */
    ingestFromArchivedRecords(records) {
        for (const record of records) {
            const pmr = record.postMortemReport;
            if (pmr?.hypothesisAccuracy) {
                const hypType = pmr.primaryHypothesis?.category ?? 'GENERAL_DIAGNOSIS';
                const outcome = pmr.hypothesisAccuracy.classification;
                // Map outcome to allowed source outcomes
                let sourceOutcome;
                if (outcome === 'SUPPORTED')
                    sourceOutcome = 'SUPPORTED';
                else if (outcome === 'PARTIALLY_SUPPORTED')
                    sourceOutcome = 'PARTIALLY_SUPPORTED';
                else if (outcome === 'REFUTED')
                    sourceOutcome = 'REFUTED';
                else
                    sourceOutcome = 'INCONCLUSIVE';
                this.recordOutcome(hypType, sourceOutcome);
            }
        }
    }
    /**
     * Computes the reliability score for a given hypothesis type.
     * Enforces N >= 3 publication rule; N < 3 returns status INSUFFICIENT_SAMPLE_SIZE.
     * Tính toán điểm độ tin cậy cho một loại giả thuyết nhất định.
     * Thực thi quy tắc công bố N >= 3; N < 3 trả về trạng thái INSUFFICIENT_SAMPLE_SIZE.
     */
    getReliability(hypothesisType) {
        const counts = this.ledger.get(hypothesisType);
        if (!counts) {
            return null;
        }
        const effectiveN = counts.supported + counts.partiallySupported + counts.refuted;
        const totalSampleCount = effectiveN + counts.inconclusive;
        if (effectiveN < HypothesisReliabilityLedger.MINIMUM_PUBLICATION_SAMPLE_SIZE) {
            return {
                hypothesisType,
                sampleCount: totalSampleCount,
                supportedCount: counts.supported,
                partiallySupportedCount: counts.partiallySupported,
                refutedCount: counts.refuted,
                inconclusiveCount: counts.inconclusive,
                reliability: null, // Suppressed due to small sample size
                status: 'INSUFFICIENT_SAMPLE_SIZE',
                evaluatedAt: Date.now(),
            };
        }
        // Standard formula: (SUPPORTED + 0.5 * PARTIALLY_SUPPORTED) / (SUPPORTED + PARTIALLY_SUPPORTED + REFUTED)
        const rawScore = (counts.supported + 0.5 * counts.partiallySupported) / effectiveN;
        const boundedReliability = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));
        return {
            hypothesisType,
            sampleCount: totalSampleCount,
            supportedCount: counts.supported,
            partiallySupportedCount: counts.partiallySupported,
            refutedCount: counts.refuted,
            inconclusiveCount: counts.inconclusive,
            reliability: boundedReliability,
            status: 'PUBLISHED',
            evaluatedAt: Date.now(),
        };
    }
    /**
     * Returns all evaluated reliability scores across registered hypothesis types.
     * Trả về tất cả các điểm độ tin cậy đã đánh giá qua các loại giả thuyết đã đăng ký.
     */
    getAllScores() {
        const results = [];
        for (const type of this.ledger.keys()) {
            const score = this.getReliability(type);
            if (score) {
                results.push(score);
            }
        }
        return Object.freeze(results);
    }
    /**
     * Resets in-memory accumulation.
     * Đặt lại sự tích lũy trong bộ nhớ.
     */
    reset() {
        this.ledger.clear();
    }
}
