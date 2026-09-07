/**
 * EN: Safe, deterministic predicate operators supported by the Postcondition Evaluator.
 * VI: Các toán tử vị từ an toàn, tất định được hỗ trợ bởi Bộ Đánh giá Postcondition.
 */
export type PredicateOperator = 'EQUALS' | 'NOT_EQUALS' | 'EXISTS' | 'NOT_EXISTS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_OR_EQUAL' | 'LESS_OR_EQUAL' | 'IN' | 'NOT_IN' | 'BOOLEAN_TRUE' | 'BOOLEAN_FALSE' | 'ALL' | 'ANY';
/**
 * EN: Priority hierarchy for postconditions. Critical failures fail verification immediately.
 * VI: Thứ bậc ưu tiên cho postcondition. Lỗi ở mức Critical sẽ khiến xác minh thất bại ngay lập tức.
 */
export type PostconditionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
/**
 * EN: Status of an individual postcondition evaluation.
 * VI: Trạng thái đánh giá của một postcondition đơn lẻ.
 */
export type PostconditionEvaluationStatus = 'PASSED' | 'FAILED' | 'UNKNOWN' | 'CONFLICTING';
/**
 * EN: Immutable postcondition specification contract.
 * VI: Hợp đồng đặc tả postcondition bất biến.
 */
export interface Postcondition {
    readonly id: string;
    readonly description: string;
    readonly targetPath: string;
    readonly operator: PredicateOperator;
    readonly expectedValue?: unknown;
    readonly required?: boolean;
    readonly priority?: PostconditionPriority;
}
/**
 * EN: Authoritative evaluation outcome for a single postcondition.
 * VI: Kết quả đánh giá có thẩm quyền cho một postcondition duy nhất.
 */
export interface PostconditionResult {
    readonly postconditionId: string;
    readonly status: PostconditionEvaluationStatus;
    readonly operator: PredicateOperator;
    readonly targetPath: string;
    readonly expectedValue?: unknown;
    readonly observedValue?: unknown;
    readonly required: boolean;
    readonly priority: PostconditionPriority;
    readonly message: string;
}
