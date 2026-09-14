import { GovernedPolicyEnforcementPoint } from '../policyEnforcement/governedPolicyEnforcementPoint.js';
import { type GroundedPlanTaskBinding, type PEPReadinessRecord } from './groundedPlanTaskTypes.js';
export interface GroundedPlanPEPPreparationBridgeOptions {
    readonly pep?: GovernedPolicyEnforcementPoint;
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanPEPPreparationBridge {
    private readonly pep;
    private readonly userStopProvider;
    constructor(options?: GroundedPlanPEPPreparationBridgeOptions);
    /**
     * EN: Evaluates execution readiness for all steps in the binding through PEP.
     * VI: Đánh giá tính sẵn sàng thực thi cho toàn bộ các bước trong ràng buộc thông qua PEP.
     */
    preparePEPReadiness(binding: GroundedPlanTaskBinding): PEPReadinessRecord;
    /**
     * EN: Maps step binding capability/action to representative tool name for PEP evaluation.
     * VI: Ánh xạ năng lực/hành động của ràng buộc bước sang tên công cụ đại diện để đánh giá PEP.
     */
    private mapStepToToolName;
}
