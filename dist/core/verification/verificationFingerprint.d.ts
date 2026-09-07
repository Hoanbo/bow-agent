import type { VerificationStatus } from './verificationStatus.js';
import type { PredicateOperator } from './postconditionTypes.js';
import type { VerificationEvidenceSource, VerificationFailureCategory } from './verificationTypes.js';
/**
 * EN: Computes deterministic fingerprint for an entire verification result.
 * VI: Tính toán fingerprint tất định cho toàn bộ kết quả xác minh.
 */
export declare function computeVerificationFingerprint(userId: string, sessionId: string, toolName: string, status: VerificationStatus, postconditionHash: string, riskLevel?: string, requestId?: string): string;
/**
 * EN: Computes deterministic fingerprint for a piece of verification evidence.
 * VI: Tính toán fingerprint tất định cho một mảnh bằng chứng xác minh.
 */
export declare function computeEvidenceFingerprint(source: VerificationEvidenceSource, path: string, observedValue: unknown): string;
/**
 * EN: Computes deterministic fingerprint for an evaluated postcondition.
 * VI: Tính toán fingerprint tất định cho một postcondition đã được đánh giá.
 */
export declare function computePostconditionFingerprint(postconditionId: string, operator: PredicateOperator, targetPath: string, expectedValue?: unknown): string;
/**
 * EN: Computes deterministic fingerprint for a verification failure descriptor.
 * VI: Tính toán fingerprint tất định cho bộ mô tả lỗi xác minh.
 */
export declare function computeVerificationFailureFingerprint(userId: string, sessionId: string, category: VerificationFailureCategory, message: string): string;
