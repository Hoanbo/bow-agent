import { MissionObjectiveBinding, MissionConflict } from './missionCoordinationTypes.js';
export declare class MissionConflictResolver {
    private readonly conflicts;
    getConflicts(): readonly MissionConflict[];
    /**
     * EN: Detects conflicts between proposed eligible objectives and currently active objectives.
     * VI: Phát hiện các xung đột giữa các mục tiêu đủ điều kiện được đề xuất và các mục tiêu đang hoạt động.
     */
    detectConflicts(eligibleObjectives: readonly MissionObjectiveBinding[], activeObjectives?: readonly MissionObjectiveBinding[]): readonly MissionConflict[];
    /**
     * EN: Evaluates if a conflict can be deterministically resolved without inventing authority.
     * VI: Đánh giá xem xung đột có thể giải quyết xác định mà không tạo ra thẩm quyền không.
     */
    resolveConflict(conflict: MissionConflict): {
        isResolved: boolean;
        strategy?: string;
    };
}
