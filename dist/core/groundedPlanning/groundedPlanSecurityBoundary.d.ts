import { type GroundedActionPlan } from './groundedPlanTypes.js';
export interface GroundedPlanSecurityBoundaryOptions {
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanSecurityBoundary {
    private readonly userStopProvider;
    constructor(options?: GroundedPlanSecurityBoundaryOptions);
    /**
     * EN: Evaluates synchronous USER_STOP supremacy. Throws GroundedPlanUserStopError if active.
     * VI: Đánh giá quyền tối cao dừng khẩn cấp USER_STOP đồng bộ. Ném lỗi GroundedPlanUserStopError nếu đang kích hoạt.
     */
    assertUserStopNotActive(checkpoint?: string): void;
    /**
     * EN: Validates tenant boundary. Throws CrossTenantGroundedPlanError if mismatch.
     * VI: Xác thực ranh giới bên thuê. Ném lỗi CrossTenantGroundedPlanError nếu không khớp.
     */
    assertTenantIsolation(planTenantId: string, activeTenantId: string): void;
    /**
     * EN: Scans text content for prompt injection patterns. Returns true if injection suspected.
     * VI: Quét nội dung văn bản tìm mẫu tấn công prompt injection. Trả về true nếu nghi ngờ có tấn công.
     */
    scanForPromptInjection(text: string): {
        isInjected: boolean;
        matchedPattern?: string;
    };
    /**
     * EN: Inspects an entire plan for security vulnerabilities and sanitizes content.
     * VI: Kiểm tra toàn bộ kế hoạch để phát hiện lỗ hổng bảo mật và làm sạch nội dung.
     */
    sanitizeAndAuditPlan(plan: GroundedActionPlan, activeTenantId: string): {
        isClean: boolean;
        securityViolations: readonly string[];
    };
    /**
     * EN: Pure text sanitization proxy delegating to globalDiagnosisSanitizer.
     * VI: Bộ đại diện làm sạch văn bản ủy thác cho globalDiagnosisSanitizer.
     */
    sanitizeText(text: string): string;
}
