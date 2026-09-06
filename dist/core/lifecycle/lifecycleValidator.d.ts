import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Scrubs and redacts secrets from any string.
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi ký tự nào.
 */
export declare function redactLifecycleSecrets(text: string): string;
/**
 * EN: Checks if a value contains any credential or secret pattern.
 * VI: Kiểm tra xem một giá trị có chứa mẫu chứng thực hoặc bí mật hay không.
 */
export declare function containsLifecycleSecret(val: unknown): boolean;
export declare const containsSecret: typeof containsLifecycleSecret;
/**
 * EN: Recursively scans an object for prototype pollution vectors.
 * VI: Quét đệ quy một đối tượng để tìm các vector ô nhiễm prototype.
 */
export declare function hasLifecyclePrototypePollution(target: unknown): boolean;
export declare const hasPrototypePollution: typeof hasLifecyclePrototypePollution;
/**
 * EN: Validates user and session scope inputs (INV-STATE-03).
 * VI: Xác thực phạm vi người dùng và phiên (INV-STATE-03).
 */
export declare function validateScope(userId: unknown, sessionId: unknown): {
    valid: boolean;
    error?: string;
};
/**
 * EN: Scans metadata objects for safety, rejecting prototype pollution, null bytes, and secrets.
 * VI: Quét các đối tượng metadata để đảm bảo an toàn, loại bỏ ô nhiễm prototype, null byte và bí mật.
 */
export declare function validateSafeMetadata(metadata: unknown): {
    valid: boolean;
    error?: string;
};
/**
 * EN: Validates monotonic risk preservation (INV-STATE-07).
 * VI: Xác thực việc bảo tồn rủi ro đơn điệu (INV-STATE-07).
 */
export declare function assertRiskPreservation(previousRisk?: PlanRiskLevel | string, newRisk?: PlanRiskLevel | string): void;
/**
 * EN: Validates monotonic governance preservation (INV-STATE-08, INV-STATE-09).
 * VI: Xác thực việc bảo tồn quản trị đơn điệu (INV-STATE-08, INV-STATE-09).
 */
export declare function assertGovernancePreservation(prevGov?: boolean, newGov?: boolean, prevAppr?: boolean, newAppr?: boolean): void;
