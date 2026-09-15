import { AdaptiveAutonomyAuthorizationEnvelope, AdaptiveAutonomyState, AutonomyBudgetSnapshot, RecoveryPolicy, AdaptationBoundary, ContinuitySnapshot } from './adaptiveAutonomyTypes.js';
export declare class AdaptiveAutonomyValidator {
    /**
     * EN: Recursively asserts no prototype pollution attacks are present in the payload.
     * VI: Khẳng định đệ quy không có tấn công ô nhiễm nguyên mẫu trong tải trọng.
     */
    assertNoPrototypePollution(data: unknown, path?: string): void;
    /**
     * EN: Recursively asserts no Chain-of-Thought (CoT) reasoning tokens are present.
     * VI: Khẳng định đệ quy không chứa thẻ suy luận Chain-of-Thought (CoT).
     */
    assertNoCoT(data: unknown, path?: string): void;
    /**
     * EN: Quarantines and sanitizes untrusted environment or prompt-injection text.
     * VI: Cách ly và khử độc văn bản môi trường không tin cậy hoặc tiêm nhiễm nhắc lệnh.
     */
    quarantineUntrustedText(text: string): {
        isQuarantined: boolean;
        sanitizedText: string;
        reason?: string;
    };
    /**
     * EN: Validates authorization envelope structure, scope, risk tier, and provenance.
     * VI: Xác thực cấu trúc phong bì ủy quyền, phạm vi, mức rủi ro và nguồn gốc.
     */
    validateAuthorizationEnvelope(envelope: AdaptiveAutonomyAuthorizationEnvelope): void;
    /**
     * EN: Validates autonomy budget limits and verifies current consumption is within bounds.
     * VI: Xác thực các giới hạn ngân sách tự chủ và kiểm tra mức tiêu thụ hiện tại nằm trong giới hạn.
     */
    validateBudget(budget: AutonomyBudgetSnapshot): void;
    /**
     * EN: Validates recovery policy limits.
     * VI: Xác thực các giới hạn chính sách phục hồi.
     */
    validateRecoveryPolicy(policy: RecoveryPolicy): void;
    /**
     * EN: Validates adaptation boundary parameters.
     * VI: Xác thực các tham số ranh giới thích ứng.
     */
    validateAdaptationBoundary(boundary: AdaptationBoundary): void;
    /**
     * EN: Validates continuity snapshot and its cryptographic hash.
     * VI: Xác thực ảnh chụp tính liên tục và mã băm mật mã của nó.
     */
    validateContinuitySnapshot(snapshot: ContinuitySnapshot): void;
    /**
     * EN: Asserts valid state transition according to the lifecycle state machine.
     * VI: Khẳng định chuyển đổi trạng thái hợp lệ theo máy trạng thái vòng đời.
     */
    assertValidStateTransition(fromState: AdaptiveAutonomyState, toState: AdaptiveAutonomyState): void;
}
