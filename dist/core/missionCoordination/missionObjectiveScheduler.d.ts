import { MissionObjectiveBinding, MissionDependencyGraph, MissionObjectiveState } from './missionCoordinationTypes.js';
export declare class MissionObjectiveScheduler {
    private readonly objectives;
    private readonly dependencies;
    private readonly dependents;
    constructor(initialObjectives?: readonly MissionObjectiveBinding[]);
    getObjectives(): readonly MissionObjectiveBinding[];
    getObjective(objectiveId: string): MissionObjectiveBinding | undefined;
    /**
     * EN: Registers an objective binding into the scheduler and builds dependency links.
     * VI: Đăng ký một ràng buộc mục tiêu vào trình lập lịch và xây dựng các liên kết phụ thuộc.
     */
    registerObjective(binding: MissionObjectiveBinding): void;
    /**
     * EN: Validates DAG cycle freedom and dependency depth constraint (<= 10).
     * VI: Xác thực tính không chu trình của DAG và ràng buộc độ sâu phụ thuộc (<= 10).
     */
    validateGraphCycleAndDepth(maxDepth?: number): void;
    /**
     * EN: Evaluates and updates readiness for all registered objectives based on completed dependencies.
     * VI: Đánh giá và cập nhật tính sẵn sàng cho tất cả các mục tiêu đã đăng ký dựa trên các phụ thuộc đã hoàn thành.
     */
    evaluateReadiness(): {
        ready: string[];
        blocked: string[];
        active: string[];
        completed: string[];
    };
    /**
     * EN: Updates objective state in place and returns updated binding.
     * VI: Cập nhật trạng thái mục tiêu tại chỗ và trả về ràng buộc đã cập nhật.
     */
    updateObjectiveState(objectiveId: string, newState: MissionObjectiveState, summary?: string): MissionObjectiveBinding;
    /**
     * EN: Cascades blocking to all downstream dependents when an upstream objective fails.
     * VI: Xếp tầng chặn tất cả các phần tử phụ thuộc xuôi dòng khi một mục tiêu thượng nguồn thất bại.
     */
    cascadeBlockDependents(failedObjectiveId: string): string[];
    getDependencyGraph(): MissionDependencyGraph;
}
