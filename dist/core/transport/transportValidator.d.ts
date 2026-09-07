import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Resource boundary constants.
 * VI: Các hằng số giới hạn tài nguyên.
 */
export declare const MAX_TRANSPORT_MESSAGE_BYTES: number;
export declare const MAX_METADATA_DEPTH = 8;
export declare const MAX_CORRELATION_LENGTH = 256;
export declare const MAX_QUEUE_DEPTH = 1000;
/**
 * EN: Validates a generic string identifier against injection, traversal, and reserved names.
 * VI: Kiểm tra một định danh chuỗi tổng quát chống lại tiêm nhiễm, duyệt đường dẫn và tên cấm.
 */
export declare function validateTransportIdentifier(name: string, value: unknown): string;
/**
 * EN: Validates 5-tuple multi-tenant scoped connection identities.
 * VI: Kiểm tra danh tính kết nối theo phạm vi đa người dùng bộ 5.
 */
export declare function validateTransportScope(params: {
    readonly userId: unknown;
    readonly sessionId: unknown;
    readonly brainId: unknown;
    readonly surfaceId: unknown;
    readonly transportId: unknown;
}): {
    userId: string;
    sessionId: string;
    brainId: string;
    surfaceId: string;
    transportId: string;
    scopeKey: string;
};
/**
 * EN: Checks whether a string contains sensitive patterns.
 * VI: Kiểm tra xem chuỗi có chứa mẫu hình nhạy cảm hay không.
 */
export declare function containsTransportSecret(input: string): boolean;
/**
 * EN: Redacts sensitive secrets from strings, error messages, and logs.
 * VI: Che dấu các bí mật nhạy cảm khỏi chuỗi, thông báo lỗi và nhật ký.
 */
export declare function redactTransportSecrets(input: string): string;
/**
 * EN: Inspects metadata object depth recursively to enforce resource bounds.
 * VI: Kiểm tra độ sâu của đối tượng metadata đệ quy để thực thi giới hạn tài nguyên.
 */
export declare function validateMetadataDepth(obj: unknown, currentDepth?: number): void;
/**
 * EN: Validates payload and metadata resource bounds.
 * VI: Kiểm tra các giới hạn tài nguyên của payload và metadata.
 */
export declare function validateMessageResourceBounds(payload: unknown): void;
/**
 * EN: Asserts risk preservation: transport message must NEVER downgrade risk.
 * VI: Khẳng định bảo toàn rủi ro: thông điệp truyền tải KHÔNG BAO GIỜ được hạ cấp rủi ro.
 */
export declare function assertTransportRiskPreservation(priorRisk: PlanRiskLevel, newRisk: PlanRiskLevel): void;
/**
 * EN: Asserts sequence monotonicity: sequence numbers must be positive integers.
 * VI: Khẳng định tính đơn điệu của chuỗi: số thứ tự phải là số nguyên dương.
 */
export declare function assertTransportSequenceMonotonicity(priorSequence: number, newSequence: number): void;
/**
 * EN: Recursively freezes an object and all nested properties for deep immutability.
 * VI: Đóng băng đệ quy một đối tượng và tất cả các thuộc tính lồng nhau để đảm bảo tính bất biến sâu.
 */
export declare function deepFreeze<T>(obj: T): Readonly<T>;
