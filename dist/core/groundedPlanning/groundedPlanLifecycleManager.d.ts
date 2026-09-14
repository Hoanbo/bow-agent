import { type GroundedActionPlan, type GroundedPlanStatus } from './groundedPlanTypes.js';
export interface GroundedPlanLifecycleManagerOptions {
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanLifecycleManager {
    private readonly userStopProvider;
    constructor(options?: GroundedPlanLifecycleManagerOptions);
    /**
     * EN: Transitions plan to target status with OCC CAS validation and USER_STOP assertion.
     * VI: Chuyển đổi trạng thái kế hoạch với kiểm tra OCC CAS và dừng khẩn cấp USER_STOP.
     */
    transitionStatus(currentPlan: GroundedActionPlan, targetStatus: GroundedPlanStatus, expectedVersion: number, mutationContext?: {
        rationale?: string;
    }): GroundedActionPlan;
}
