// src/core/policyEvolution/counterfactualSimulationEngine.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Governed counterfactual incident replay and simulation engine.
// Replays candidate policy diffs against historical IncidentHistoryArchiveStore records
// to quantify simulated MTTR impact, recovery success rate deltas, and potential safety regressions.
// Authority Invariant: Level 0 Read-Only Analysis ONLY.
// Zero real action execution, zero policy mutation, zero shell execution primitives.
// Động cơ mô phỏng và phát lại sự cố phản thực tế có quản trị.
// Phát lại các khác biệt chính sách ứng viên trên các bản ghi IncidentHistoryArchiveStore lịch sử
// để định lượng tác động MTTR mô phỏng, độ lệch tỷ lệ thành công phục hồi và rủi ro thoái lui an toàn.
// Bất biến thẩm quyền: CHỈ Phân tích Chỉ đọc Cấp 0.
import { createSimulationId, } from './policyEvolutionTypes.js';
import { IncidentHistoryArchiveStore } from '../crossIncident/incidentHistoryArchiveStore.js';
export class CounterfactualSimulationEngine {
    archiveStore;
    constructor(archiveStore = new IncidentHistoryArchiveStore()) {
        this.archiveStore = archiveStore;
    }
    /**
     * Replays proposed policy changes counterfactually against archived incident history.
     * Simulates what would have happened if the proposed policy were active.
     * Total authority: Level 0 Read-Only Analysis. Real execution is strictly prohibited.
     * Phát lại các thay đổi chính sách đề xuất theo phương pháp phản thực tế trên lịch sử sự cố đã lưu trữ.
     */
    simulateProposal(proposal, options) {
        if (!proposal || !proposal.proposalId) {
            throw new Error('SIMULATION_FAILED: Valid PolicyEvolutionProposal is required.');
        }
        const limit = Math.max(1, Math.min(options?.maxReplayIncidents ?? 50, 200));
        // Bounded query from historical incident archive
        const queryResult = this.archiveStore.queryIncidents({ limit }, options?.userId);
        const records = queryResult.records;
        const simulationId = createSimulationId(`sim_${Date.now()}_${proposal.proposalId.slice(-8)}`);
        if (records.length === 0) {
            return {
                simulationId,
                proposalId: proposal.proposalId,
                replayedIncidentsCount: 0,
                simulatedMttrDeltaMs: 0,
                simulatedRecoverySuccessRateDelta: 0,
                simulatedSafetyRegressionsCount: 0,
                simulatedGateFrictionDelta: 0,
                affectedCategories: Object.freeze([]),
                affectedTargets: Object.freeze([]),
                uncertaintyBound: 1.0, // High uncertainty due to zero sample size
                isCounterfactualSimulation: true,
                evaluatedAt: Date.now(),
            };
        }
        const categories = new Set();
        const targets = new Set();
        let totalMttrDelta = 0;
        let successfulRecoveryCount = 0;
        let safetyRegressionsCount = 0;
        let gateFrictionDelta = 0;
        const modified = proposal.candidatePolicyDiff.modifiedClassifications;
        for (const rec of records) {
            categories.add(rec.failureCategory);
            targets.add(rec.targetId);
            const actionClass = rec.actionClass;
            const originalStatus = rec.closureRecord.status;
            // Check if proposed policy diff affects this action
            const proposedClass = modified[actionClass];
            if (proposedClass) {
                // If an action was originally classified as HIGH_IMPACT and proposed as REVERSIBLE:
                // Simulation estimates reduced human gate wait time (-15000ms MTTR), but checks if safety is preserved
                if (proposedClass === 'REVERSIBLE') {
                    totalMttrDelta -= 15000;
                    gateFrictionDelta -= 1;
                    if (originalStatus === 'CLOSED_ROLLED_BACK') {
                        // A rolled back action being less restricted represents a potential safety risk
                        safetyRegressionsCount++;
                    }
                    else {
                        successfulRecoveryCount++;
                    }
                }
                else if (proposedClass === 'HIGH_IMPACT') {
                    // Additional gate added -> higher MTTR (+15000ms), but zero safety regressions
                    totalMttrDelta += 15000;
                    gateFrictionDelta += 1;
                }
            }
            else {
                if (originalStatus === 'CLOSED_RESOLVED') {
                    successfulRecoveryCount++;
                }
            }
        }
        const avgMttrDelta = Math.round(totalMttrDelta / records.length);
        const baselineSuccessRate = records.filter((r) => r.closureRecord.status === 'CLOSED_RESOLVED').length / records.length;
        const simulatedSuccessRate = successfulRecoveryCount / records.length;
        const successRateDelta = Math.round((simulatedSuccessRate - baselineSuccessRate) * 1000) / 1000;
        // Uncertainty bound diminishes as sample size grows: 1 / sqrt(N)
        const uncertaintyBound = Math.round((1 / Math.sqrt(records.length)) * 100) / 100;
        return {
            simulationId,
            proposalId: proposal.proposalId,
            replayedIncidentsCount: records.length,
            simulatedMttrDeltaMs: avgMttrDelta,
            simulatedRecoverySuccessRateDelta: successRateDelta,
            simulatedSafetyRegressionsCount: safetyRegressionsCount,
            simulatedGateFrictionDelta: gateFrictionDelta,
            affectedCategories: Object.freeze(Array.from(categories)),
            affectedTargets: Object.freeze(Array.from(targets)),
            uncertaintyBound,
            isCounterfactualSimulation: true,
            evaluatedAt: Date.now(),
        };
    }
}
