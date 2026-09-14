import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface GroundedPlanTaskSecurityBoundaryOptions {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanTaskSecurityBoundary {
    private readonly sanitizer;
    private readonly userStopProvider;
    constructor(options?: GroundedPlanTaskSecurityBoundaryOptions);
    /**
     * EN: Asserts tenant identity matches the authorized active partition.
     * VI: Khẳng định định danh bên thuê khớp với phân vùng hoạt động được ủy quyền.
     */
    assertTenantMatches(requestedTenant: string, activeTenant: string): void;
    /**
     * EN: Asserts session identity matches active session.
     * VI: Khẳng định định danh phiên khớp với phiên hoạt động.
     */
    assertSessionMatches(requestedSession: string, activeSession: string): void;
    /**
     * EN: Scans text for prompt injection patterns. Returns true if suspicious instruction detected.
     * VI: Quét văn bản để tìm mẫu tiêm prompt. Trả về true nếu phát hiện chỉ thị đáng ngờ.
     */
    detectPromptInjection(text: string): boolean;
    /**
     * EN: Sanitizes secrets and sensitive tokens from arbitrary object payloads.
     * VI: Khử khuẩn bí mật và token nhạy cảm khỏi tải trọng đối tượng bất kỳ.
     */
    sanitizePayload<T>(payload: T): T;
}
