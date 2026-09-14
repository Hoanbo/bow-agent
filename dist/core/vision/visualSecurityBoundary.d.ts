import { type VisualElement, type VisualSecurityAlert } from './visionTypes.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export declare const INJECTION_SIGNATURES: readonly string[];
export interface VisualQuarantineEnvelope {
    readonly visualContent: {
        readonly rawObservedText: string;
        readonly isExecutionInstruction: false;
        readonly containsSuspiciousTokens: boolean;
    };
    readonly securityAlerts: readonly VisualSecurityAlert[];
    readonly sanitizedText: string;
}
export interface SecurityBoundaryOptions {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly userStopProvider?: () => boolean;
}
export declare class VisualSecurityBoundary {
    private readonly sanitizer;
    private readonly userStopProvider;
    constructor(options?: SecurityBoundaryOptions);
    /**
     * EN: Synchronously asserts USER_STOP preemption before any visual mutation.
     * VI: Kiểm tra đồng bộ quyền ưu tiên USER_STOP trước mọi đột biến thị giác.
     */
    assertUserStopNotActive(checkpoint: string): void;
    /**
     * EN: Asserts tenant isolation. Throws CrossTenantVisionError on mismatch.
     * VI: Khẳng định sự cô lập khách thuê. Báo lỗi CrossTenantVisionError nếu không khớp.
     */
    assertTenantIsolation(requestedTenant: string, activeTenant: string): void;
    /**
     * EN: Inspects screen text and wraps it in a non-executable quarantine envelope.
     * VI: Kiểm tra văn bản màn hình và đóng gói vào phong bì cách ly không thể thực thi.
     */
    quarantineScreenText(frameId: string, rawText: string): VisualQuarantineEnvelope;
    /**
     * EN: Deep-sanitizes visual elements, removing raw credentials and flagging injections.
     * VI: Khử trùng sâu các phần tử thị giác, loại bỏ thông tin xác thực và gắn cờ prompt-injection.
     */
    sanitizeVisualElements(elements: readonly VisualElement[]): {
        sanitizedElements: readonly VisualElement[];
        alerts: readonly VisualSecurityAlert[];
    };
    /**
     * EN: Secret sanitization reusing DiagnosisSanitizer and CloudEscalationSanitizer.
     * VI: Khử trùng bí mật tái sử dụng DiagnosisSanitizer và CloudEscalationSanitizer.
     */
    sanitizeText(raw: string): string;
}
export declare const globalVisualSecurityBoundary: VisualSecurityBoundary;
