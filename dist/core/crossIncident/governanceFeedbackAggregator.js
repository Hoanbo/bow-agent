// src/core/crossIncident/governanceFeedbackAggregator.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Governed supervisory feedback aggregator and policy refinement advisory engine.
// Aggregates historical human supervisory outcomes (approvals, denials, overrides)
// and synthesizes non-mutating operational policy refinement advisories.
// Invariant: POLICY_RECOMMENDATION != POLICY_MUTATION (never mutates PDP or human gates).
// Trình tổng hợp phản hồi giám sát và động cơ tư vấn tinh chỉnh chính sách có quản trị.
// Tổng hợp các kết quả giám sát của con người trong lịch sử (phê duyệt, từ chối, ghi đè)
// và tổng hợp các khuyến nghị tư vấn tinh chỉnh chính sách vận hành không gây biến đổi.
// Bất biến: POLICY_RECOMMENDATION != POLICY_MUTATION (tuyệt đối không biến đổi PDP hay cổng người).
import { createAdvisoryId, } from './crossIncidentTypes.js';
export class GovernanceFeedbackAggregator {
    // Map targetScope -> SupervisoryOutcomeCounts
    outcomeMap = new Map();
    /**
     * Records an observed supervisory interaction outcome.
     * Ghi nhận một kết quả tương tác giám sát đã quan sát.
     */
    recordSupervisoryOutcome(targetScope, outcome) {
        const current = this.outcomeMap.get(targetScope) ?? {
            approvals: 0,
            denials: 0,
            overrides: 0,
        };
        if (outcome === 'APPROVAL')
            current.approvals++;
        else if (outcome === 'DENIAL')
            current.denials++;
        else if (outcome === 'OVERRIDE')
            current.overrides++;
        this.outcomeMap.set(targetScope, current);
    }
    /**
     * Ingests closure records and post-mortems from archived incidents.
     * Nhập các bản ghi đóng sự cố và hậu kiểm từ các sự cố đã lưu trữ.
     */
    ingestFromArchivedRecords(records) {
        for (const record of records) {
            const scope = `${record.targetId}:${record.actionClass}`;
            // Map closure status to supervisory feedback pattern
            if (record.closureRecord.status === 'CLOSED_RESOLVED') {
                this.recordSupervisoryOutcome(scope, 'APPROVAL');
            }
            else if (record.closureRecord.status === 'CLOSED_ROLLED_BACK') {
                this.recordSupervisoryOutcome(scope, 'DENIAL');
            }
            else if (record.closureRecord.status === 'ESCALATED_TO_HUMAN') {
                this.recordSupervisoryOutcome(scope, 'OVERRIDE');
            }
        }
    }
    /**
     * Generates a non-mutating policy refinement advisory for a target scope.
     * STRICTLY ADVISORY: Emits invariant notice POLICY_RECOMMENDATION != POLICY_MUTATION.
     * Never mutates PDP rules, gate thresholds, or authorization engines.
     * Tạo khuyến nghị tư vấn tinh chỉnh chính sách không biến đổi cho một phạm vi mục tiêu.
     * NGHIÊM NGẶT TƯ VẤN: Phát cảnh báo bất biến POLICY_RECOMMENDATION != POLICY_MUTATION.
     * Tuyệt đối không biến đổi quy tắc PDP, ngưỡng cổng hay động cơ ủy quyền.
     */
    generateAdvisory(targetScope, actionClass) {
        const counts = this.outcomeMap.get(targetScope) ?? {
            approvals: 0,
            denials: 0,
            overrides: 0,
        };
        const total = counts.approvals + counts.denials + counts.overrides;
        const approvalRate = total > 0 ? Math.round((counts.approvals / total) * 1000) / 1000 : 0;
        let recommendation;
        if (total === 0) {
            recommendation = 'INSUFFICIENT_DATA: No historical supervisory interactions observed for this scope.';
        }
        else if (approvalRate > 0.8 && counts.overrides === 0) {
            recommendation = 'CONSIDER_STREAMLINING: High approval consistency observed; review candidate actions for lower friction.';
        }
        else if (counts.overrides > 0 || approvalRate < 0.5) {
            recommendation = 'RECOMMEND_ELEVATED_SCRUTINY: Frequent denials or supervisor overrides observed; recommend human review gate retention.';
        }
        else {
            recommendation = 'BALANCED_STABILITY: Historical supervisory interactions reflect nominal governance gate operations.';
        }
        const advisoryId = createAdvisoryId(`adv_${Date.now()}_${targetScope.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 16)}`);
        return {
            advisoryId,
            targetScope,
            actionClass,
            totalApprovals: counts.approvals,
            totalDenials: counts.denials,
            totalOverrides: counts.overrides,
            approvalRate,
            advisoryRecommendation: recommendation,
            invariantNotice: 'POLICY_RECOMMENDATION != POLICY_MUTATION',
            generatedAt: Date.now(),
        };
    }
    /**
     * Resets outcome aggregator state.
     * Đặt lại trạng thái bộ tổng hợp kết quả.
     */
    reset() {
        this.outcomeMap.clear();
    }
}
