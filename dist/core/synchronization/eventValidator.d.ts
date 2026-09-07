import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Validates a generic string identifier against injection, traversal, and reserved names.
 * VI: Kiểm tra một định danh chuỗi tổng quát chống lại tiêm nhiễm, duyệt đường dẫn và tên cấm.
 */
export declare function validateEventIdentifier(name: string, value: unknown): string;
/**
 * EN: Validates multi-tenant scope isolation inputs (userId, sessionId, brainId).
 * VI: Kiểm tra đầu vào cô lập phạm vi đa người dùng (userId, sessionId, brainId).
 */
export declare function validateSyncScope(userId: unknown, sessionId: unknown, brainId: unknown): {
    userId: string;
    sessionId: string;
    brainId: string;
};
/**
 * EN: Checks whether a string contains sensitive patterns.
 * VI: Kiểm tra xem chuỗi có chứa mẫu hình nhạy cảm hay không.
 */
export declare function containsEventSecret(input: string): boolean;
/**
 * EN: Redacts sensitive secrets from log and error messages.
 * VI: Che dấu các bí mật nhạy cảm khỏi thông báo lỗi và nhật ký.
 */
export declare function redactEventSecrets(input: string): string;
/**
 * EN: Asserts risk preservation: new risk must NEVER be lower than prior risk.
 * VI: Khẳng định bảo toàn rủi ro: rủi ro mới KHÔNG BAO GIỜ được thấp hơn rủi ro trước.
 */
export declare function assertEventRiskPreservation(priorRisk: PlanRiskLevel, newRisk: PlanRiskLevel): void;
/**
 * EN: Asserts sequence monotonicity: sequence numbers must be positive and non-decreasing.
 * VI: Khẳng định tính đơn điệu của chuỗi: số thứ tự phải là số nguyên dương và không giảm.
 */
export declare function assertEventSequenceMonotonicity(priorSequence: number, newSequence: number): void;
