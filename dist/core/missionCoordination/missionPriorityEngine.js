// src/core/missionCoordination/missionPriorityEngine.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1102 — REAL
//
// EN: Deterministic multi-objective priority engine, starvation tracker, and priority inversion detector.
//     Priority strictly orders scheduling among already-authorized objectives with ZERO execution authority.
// VI: Động cơ ưu tiên đa mục tiêu xác định, theo dõi sự đói tài nguyên và phát hiện nghịch đảo ưu tiên.
//     Độ ưu tiên chỉ sắp xếp thứ tự lập lịch giữa các mục tiêu đã được ủy quyền với KHÔNG quyền thực thi.
import { MAX_STARVATION_CYCLES, } from './missionCoordinationTypes.js';
export class MissionPriorityEngine {
    policy;
    starvationCounters = new Map();
    constructor(policy) {
        this.policy = {
            basePriorityWeight: policy?.basePriorityWeight ?? 10.0,
            dependencyReadinessWeight: policy?.dependencyReadinessWeight ?? 5.0,
            urgencyWeight: policy?.urgencyWeight ?? 3.0,
            starvationWeight: policy?.starvationWeight ?? 2.0,
            riskTierPenaltyWeight: policy?.riskTierPenaltyWeight ?? 1.0,
            immutableHumanPriorityOverride: policy?.immutableHumanPriorityOverride ?? true,
        };
    }
    /**
     * EN: Evaluates deterministic priority scores and ranks eligible objectives.
     * VI: Đánh giá điểm ưu tiên xác định và xếp hạng các mục tiêu đủ điều kiện.
     */
    evaluatePriorities(eligibleObjectives, activeObjectives = []) {
        const scores = {};
        const starvedObjectiveIds = [];
        for (const obj of eligibleObjectives) {
            const currentStarvation = this.starvationCounters.get(obj.objectiveId) ?? 0;
            if (currentStarvation >= MAX_STARVATION_CYCLES) {
                starvedObjectiveIds.push(obj.objectiveId);
            }
            // 1. Immutable human explicit priority override if configured
            if (this.policy.immutableHumanPriorityOverride && typeof obj.humanExplicitPriority === 'number') {
                scores[obj.objectiveId] = obj.humanExplicitPriority * 100.0 + currentStarvation * this.policy.starvationWeight;
                continue;
            }
            // 2. Deterministic composite calculation
            let score = this.policy.basePriorityWeight;
            // Dependency readiness bonus
            if (obj.state === 'READY') {
                score += this.policy.dependencyReadinessWeight;
            }
            // Starvation boost
            score += currentStarvation * this.policy.starvationWeight;
            // Risk tier weighting (Higher risk tiers carry scrutiny penalty)
            if (obj.riskTier === 'CRITICAL') {
                score -= this.policy.riskTierPenaltyWeight * 3.0;
            }
            else if (obj.riskTier === 'HIGH') {
                score -= this.policy.riskTierPenaltyWeight * 1.5;
            }
            scores[obj.objectiveId] = Math.round(score * 100) / 100;
        }
        // Deterministic ranking: highest score first, tie-break lexicographically by objectiveId
        const rankedObjectiveIds = [...eligibleObjectives]
            .sort((a, b) => {
            const scoreA = scores[a.objectiveId] ?? 0;
            const scoreB = scores[b.objectiveId] ?? 0;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            return a.objectiveId.localeCompare(b.objectiveId);
        })
            .map((o) => o.objectiveId);
        // Detect priority inversion: if active objective has lower score than top eligible waiting objective
        let priorityInversionDetected = false;
        let inversionDetails;
        if (rankedObjectiveIds.length > 0 && activeObjectives.length > 0) {
            const topWaitingId = rankedObjectiveIds[0];
            const topWaitingScore = scores[topWaitingId] ?? 0;
            for (const active of activeObjectives) {
                const activeScore = scores[active.objectiveId] ?? this.policy.basePriorityWeight;
                if (topWaitingScore > activeScore + 10.0) {
                    priorityInversionDetected = true;
                    inversionDetails = `Priority inversion detected: waiting objective '${topWaitingId}' (score=${topWaitingScore}) outranks active objective '${active.objectiveId}' (score=${activeScore})`;
                    break;
                }
            }
        }
        return {
            rankedObjectiveIds,
            priorityScores: scores,
            starvationDetected: starvedObjectiveIds.length > 0,
            starvedObjectiveIds,
            priorityInversionDetected,
            inversionDetails,
        };
    }
    /**
     * EN: Increments starvation counters for eligible objectives that were not selected.
     * VI: Tăng bộ đếm đói tài nguyên cho các mục tiêu đủ điều kiện nhưng không được chọn.
     */
    recordCycleSelection(eligibleObjectiveIds, selectedObjectiveId) {
        for (const id of eligibleObjectiveIds) {
            if (id === selectedObjectiveId) {
                this.starvationCounters.set(id, 0); // Reset selected objective
            }
            else {
                const prev = this.starvationCounters.get(id) ?? 0;
                this.starvationCounters.set(id, prev + 1);
            }
        }
    }
    getStarvationAge(objectiveId) {
        return this.starvationCounters.get(objectiveId) ?? 0;
    }
}
