import { type GroundedActionStep } from './groundedPlanTypes.js';
export declare class PlanDependencyGraphEngine {
    /**
     * EN: Validates step dependencies, checks for cycles, and returns topologically ordered steps.
     * VI: Xác thực phụ thuộc giữa các bước, kiểm tra chu trình và trả về các bước xếp theo thứ tự topo.
     */
    static validateAndSort(steps: readonly GroundedActionStep[]): GroundedActionStep[];
}
