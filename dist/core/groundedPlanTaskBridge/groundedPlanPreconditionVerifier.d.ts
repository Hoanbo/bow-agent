import { type GroundedPlanTaskBinding, type PreconditionVerificationResult } from './groundedPlanTaskTypes.js';
export type PreconditionEvaluatorFn = (precondition: string, context: Readonly<Record<string, unknown>>) => {
    satisfied: boolean;
    reason: string;
    evidence?: Record<string, unknown>;
};
export interface GroundedPlanTaskPreconditionVerifierOptions {
    readonly userStopProvider?: () => boolean;
    readonly customEvaluators?: Readonly<Record<string, PreconditionEvaluatorFn>>;
}
export declare class GroundedPlanPreconditionVerifier {
    private readonly userStopProvider;
    private readonly customEvaluators;
    constructor(options?: GroundedPlanTaskPreconditionVerifierOptions);
    /**
     * EN: Evaluates all preconditions declared on the binding and its steps.
     * VI: Đánh giá tất cả tiền điều kiện được khai báo trên ràng buộc và các bước của nó.
     */
    verifyBindingPreconditions(binding: GroundedPlanTaskBinding, context?: Readonly<Record<string, unknown>>): {
        allSatisfied: boolean;
        results: readonly PreconditionVerificationResult[];
    };
    /**
     * EN: Evaluates a single declarative precondition with fails-closed default.
     * VI: Đánh giá một tiền điều kiện mang tính khai báo với mặc định đóng an toàn.
     */
    evaluateSinglePrecondition(precondition: string, context: Readonly<Record<string, unknown>>): PreconditionVerificationResult;
}
