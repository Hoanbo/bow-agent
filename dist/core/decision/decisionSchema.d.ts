/**
 * EN: Detects if a string contains known secret patterns.
 * VI: Phát hiện chuỗi có chứa các mẫu bí mật đã biết hay không.
 */
export declare function containsSecrets(value: string): boolean;
/**
 * EN: Detects if a string contains prototype pollution or null-byte attack vectors.
 * VI: Phát hiện chuỗi có chứa vector tấn công ô nhiễm prototype hoặc ký tự null hay không.
 */
export declare function hasSecurityAnomaly(value: unknown): boolean;
/**
 * EN: Deeply inspects an object for prototype pollution properties or forbidden keys.
 * VI: Kiểm tra sâu một object để tìm thuộc tính ô nhiễm prototype hoặc các khóa bị cấm.
 */
export declare function containsPrototypePollution(target: unknown): boolean;
/**
 * EN: Validates the structural integrity, security constraints, and scoping of a DecisionInput.
 * VI: Xác thực tính toàn vẹn cấu trúc, các ràng buộc an ninh và phạm vi của DecisionInput.
 */
export declare function validateDecisionInput(input: unknown): {
    valid: boolean;
    errors: readonly string[];
};
