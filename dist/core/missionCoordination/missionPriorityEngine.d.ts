import { MissionObjectiveBinding, MissionPriorityPolicy } from './missionCoordinationTypes.js';
export interface PriorityEvaluationResult {
    readonly rankedObjectiveIds: readonly string[];
    readonly priorityScores: Record<string, number>;
    readonly starvationDetected: boolean;
    readonly starvedObjectiveIds: readonly string[];
    readonly priorityInversionDetected: boolean;
    readonly inversionDetails?: string;
}
export declare class MissionPriorityEngine {
    private readonly policy;
    private readonly starvationCounters;
    constructor(policy?: Partial<MissionPriorityPolicy>);
    /**
     * EN: Evaluates deterministic priority scores and ranks eligible objectives.
     * VI: Đánh giá điểm ưu tiên xác định và xếp hạng các mục tiêu đủ điều kiện.
     */
    evaluatePriorities(eligibleObjectives: readonly MissionObjectiveBinding[], activeObjectives?: readonly MissionObjectiveBinding[]): PriorityEvaluationResult;
    /**
     * EN: Increments starvation counters for eligible objectives that were not selected.
     * VI: Tăng bộ đếm đói tài nguyên cho các mục tiêu đủ điều kiện nhưng không được chọn.
     */
    recordCycleSelection(eligibleObjectiveIds: readonly string[], selectedObjectiveId?: string): void;
    getStarvationAge(objectiveId: string): number;
}
