import type { GroundedActionPlan, GroundedActionStep } from '../groundedPlanning/groundedPlanTypes.js';
import { type GroundedPlanTaskBinding, type GroundedPlanTaskStepBinding } from './groundedPlanTaskTypes.js';
export interface GroundedPlanTaskAdapterOptions {
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanTaskAdapter {
    private readonly userStopProvider;
    constructor(options?: GroundedPlanTaskAdapterOptions);
    /**
     * EN: Transforms an approved GroundedActionPlan into an immutable GroundedPlanTaskBinding.
     * VI: Chuyển đổi một GroundedActionPlan đã duyệt thành một GroundedPlanTaskBinding bất biến.
     */
    adaptPlanToTaskBinding(plan: GroundedActionPlan): GroundedPlanTaskBinding;
    /**
     * EN: Deterministically maps a GroundedActionStep into a GroundedPlanTaskStepBinding.
     * VI: Ánh xạ xác định một GroundedActionStep thành một GroundedPlanTaskStepBinding.
     */
    adaptStep(step: GroundedActionStep, bindingId: string, index: number): GroundedPlanTaskStepBinding;
    /**
     * EN: Maps plan intent type to representative capabilityId and actionName.
     * VI: Ánh xạ loại ý định của kế hoạch sang capabilityId và actionName đại diện.
     */
    private mapIntentToCapabilityAction;
}
