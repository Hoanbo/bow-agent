import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Scrubs and redacts secrets from any text.
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi văn bản nào.
 */
export declare function redactCoordinationSecrets(text: string): string;
/**
 * EN: Checks if a value contains any credential or secret pattern.
 * VI: Kiểm tra xem một giá trị có chứa mẫu chứng thực hoặc bí mật hay không.
 */
export declare function containsCoordinationSecret(val: unknown): boolean;
/**
 * EN: Recursively scans an object for prototype pollution vectors.
 * VI: Quét đệ quy một đối tượng để tìm các vector ô nhiễm prototype.
 */
export declare function hasCoordinationPrototypePollution(target: unknown): boolean;
/**
 * EN: Enforces valid tenant, session, and Brain identity boundaries.
 * VI: Thực thi ranh giới định danh tenant, phiên và Não bộ hợp lệ.
 */
export declare function validateCoordinationScope(userId: string, sessionId: string, brainId?: string): void;
/**
 * EN: Enforces that risk level is never downgraded during coordination or handoff.
 * VI: Thực thi việc không bao giờ hạ cấp mức độ rủi ro trong quá trình điều phối hoặc bàn giao.
 */
export declare function assertCoordinationRiskPreservation(priorRisk: PlanRiskLevel, currentRisk: PlanRiskLevel): void;
/**
 * EN: Enforces monotonic sequence advancement to prevent stale updates or replay.
 * VI: Thực thi bước tiến số thứ tự sequence đơn điệu để chống cập nhật cũ hoặc replay.
 */
export declare function assertCoordinationSequenceMonotonicity(currentSequence: number, incomingSequence: number): void;
