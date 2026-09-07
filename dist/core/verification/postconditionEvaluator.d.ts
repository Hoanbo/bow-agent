import type { Postcondition, PostconditionResult, PredicateOperator, PostconditionEvaluationStatus } from './postconditionTypes.js';
/**
 * EN: Safely resolves a nested property path from an arbitrary object without prototype pollution.
 * VI: Phân giải an toàn đường dẫn thuộc tính lồng nhau từ đối tượng bất kỳ mà không bị ô nhiễm prototype.
 */
export declare function resolveSafePath(target: unknown, path: string): {
    exists: boolean;
    value: unknown;
};
/**
 * EN: Evaluates a supported safe predicate operator against observed and expected values.
 * VI: Đánh giá một toán tử vị từ an toàn được hỗ trợ dựa trên giá trị quan sát và giá trị kỳ vọng.
 */
export declare function evaluatePredicate(operator: PredicateOperator, observedValue: unknown, expectedValue: unknown, exists: boolean): {
    passed: boolean;
    status: PostconditionEvaluationStatus;
    message: string;
};
/**
 * EN: Evaluates an individual postcondition against the observed execution state.
 * VI: Đánh giá một postcondition riêng lẻ dựa trên trạng thái thực thi quan sát được.
 */
export declare function evaluatePostcondition(postcondition: Postcondition, observedState: unknown): PostconditionResult;
