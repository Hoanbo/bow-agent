import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { VerificationStatus } from './verificationStatus.js';
import type { Postcondition, PostconditionResult } from './postconditionTypes.js';
/**
 * EN: Provenance source of observed verification evidence.
 * VI: Nguồn gốc xuất xứ của bằng chứng xác minh quan sát được.
 */
export type VerificationEvidenceSource = 'EXECUTION_OUTPUT' | 'OBSERVED_STATE' | 'CONTEXT' | 'MEMORY' | 'PERCEPTION';
/**
 * EN: Observational classification status of evidence.
 * VI: Trạng thái phân loại quan sát của bằng chứng.
 */
export type VerificationEvidenceStatus = 'OBSERVED' | 'EXPECTED' | 'UNKNOWN' | 'CONFLICTING';
/**
 * EN: Structured piece of evidence backing a verification evaluation.
 * VI: Mảnh bằng chứng có cấu trúc hỗ trợ cho việc đánh giá xác minh.
 */
export interface VerificationEvidence {
    readonly evidenceId: string;
    readonly source: VerificationEvidenceSource;
    readonly path: string;
    readonly observedValue: unknown;
    readonly expectedValue?: unknown;
    readonly matched: boolean;
    readonly status: VerificationEvidenceStatus;
    readonly timestamp?: string;
}
/**
 * EN: Deterministic failure categories for verification breakdowns.
 * VI: Các danh mục lỗi tất định cho các trường hợp thất bại xác minh.
 */
export type VerificationFailureCategory = 'VALIDATION_FAILURE' | 'MISSING_EVIDENCE' | 'POSTCONDITION_FAILURE' | 'CONFLICTING_EVIDENCE' | 'EXECUTION_FAILURE' | 'SECURITY_FAILURE' | 'SCOPE_FAILURE' | 'INTERNAL_FAILURE';
/**
 * EN: Structured, secret-scrubbed failure descriptor.
 * VI: Bộ mô tả lỗi có cấu trúc, đã được tẩy sạch bí mật.
 */
export interface VerificationFailure {
    readonly category: VerificationFailureCategory;
    readonly message: string;
    readonly recoverable: boolean;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly fingerprint: string;
}
/**
 * EN: Actionable recommendation produced by the verification engine.
 * VI: Khuyến nghị có thể hành động do động cơ xác minh đưa ra.
 */
export type VerificationRecommendation = 'NONE' | 'RETRY_RECOMMENDED' | 'CLARIFICATION_REQUIRED' | 'MANUAL_INSPECTION' | 'ABORT';
/**
 * EN: Quantitative aggregate summary of postcondition results.
 * VI: Tóm tắt định lượng tổng hợp của các kết quả postcondition.
 */
export interface VerificationSummary {
    readonly totalPostconditions: number;
    readonly passedCount: number;
    readonly failedCount: number;
    readonly unknownCount: number;
    readonly conflictingCount: number;
    readonly allRequiredPassed: boolean;
}
/**
 * EN: Normalized, sanitized view of execution outcome ready for postcondition evaluation.
 * VI: Dạng xem kết quả thực thi đã được chuẩn hóa, khử trùng, sẵn sàng cho đánh giá postcondition.
 */
export interface NormalizedExecutionResult {
    readonly executionSucceeded: boolean;
    readonly toolName: string;
    readonly actionName?: string;
    readonly observedState: Readonly<Record<string, unknown>>;
    readonly rawOutput?: unknown;
    readonly error?: string;
    readonly risk: PlanRiskLevel;
    readonly executionDurationMs: number;
    readonly executionFingerprint?: string;
}
/**
 * EN: Authoritative request contract submitted to VerificationService.
 * VI: Hợp đồng yêu cầu có thẩm quyền được gửi tới VerificationService.
 */
export interface VerificationRequest {
    readonly requestId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly toolName: string;
    readonly actionName?: string;
    readonly executionResult: {
        readonly success: boolean;
        readonly output?: unknown;
        readonly data?: unknown;
        readonly error?: unknown;
        readonly status?: string;
        readonly riskLevel?: PlanRiskLevel;
        readonly executionDurationMs?: number;
        readonly executionFingerprint?: string;
    };
    readonly postconditions?: readonly Postcondition[];
    readonly contextEvidence?: readonly VerificationEvidence[];
    readonly riskLevel?: PlanRiskLevel;
    readonly correlationId?: string;
    readonly timestamp?: string;
}
/**
 * EN: Comprehensive, deeply immutable verification outcome.
 * VI: Kết quả xác minh toàn diện, bất biến sâu.
 */
export interface VerificationResult {
    readonly verificationId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly toolName: string;
    readonly actionName?: string;
    readonly status: VerificationStatus;
    readonly confidence: number;
    readonly riskLevel: PlanRiskLevel;
    readonly executionSucceeded: boolean;
    readonly taskSucceeded: boolean;
    readonly postconditionResults: readonly PostconditionResult[];
    readonly evidence: readonly VerificationEvidence[];
    readonly summary: VerificationSummary;
    readonly failure?: VerificationFailure;
    readonly recommendation: VerificationRecommendation;
    readonly fingerprint: string;
    readonly verifiedAt?: string;
}
