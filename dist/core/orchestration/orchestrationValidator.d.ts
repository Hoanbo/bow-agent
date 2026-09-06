import type { DecisionResult } from '../decision/decisionTypes.js';
import type { DecisionContext } from '../planning/planningTypes.js';
/**
 * EN: Checks if a value contains dangerous security vectors (secrets, null-bytes, pollution).
 * VI: Kiểm tra xem giá trị có chứa vector bảo mật nguy hiểm hay không (bí mật, null-byte, ô nhiễm).
 */
export declare function containsSecurityVector(value: unknown): boolean;
/**
 * EN: Deep check for prototype pollution properties in objects.
 * VI: Kiểm tra sâu thuộc tính ô nhiễm prototype trong object.
 */
export declare function hasPrototypePollution(target: unknown): boolean;
/**
 * EN: Deep parameter validation ensuring clean, safe execution parameters.
 * VI: Xác thực tham số sâu đảm bảo tham số thực thi an toàn, sạch sẽ.
 */
export declare function validateParameters(params: unknown): {
    valid: boolean;
    errors: readonly string[];
};
/**
 * EN: Validates decision context and result integrity for orchestration.
 * VI: Xác thực tính toàn vẹn của decision context và result cho quá trình điều phối.
 */
export declare function validateOrchestrationInput(decision: DecisionResult, context?: DecisionContext): {
    valid: boolean;
    errors: readonly string[];
};
