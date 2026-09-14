// src/core/groundedPlanning/groundedPlanSecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.07: GROUNDED PLAN SECURITY BOUNDARY
// Component 1045 — REAL
//
// EN: Security firewall for grounded action plans. Enforces screenshot injection containment,
//     secret/PII sanitization, tenant isolation assertion, and synchronous USER_STOP preemption.
// VI: Tường lửa bảo mật cho kế hoạch hành động gắn kết. Thực thi kiểm dịch chỉ dẫn độc hại màn hình,
//     làm sạch bí mật/PII, kiểm tra cô lập bên thuê và thực thi dừng khẩn cấp USER_STOP.
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { GroundedPlanUserStopError, CrossTenantGroundedPlanError, } from './groundedPlanTypes.js';
const INJECTION_PATTERNS = Object.freeze([
    'ignore previous instructions',
    'system prompt',
    'you are now',
    'developer message',
    'override instructions',
    'dan mode',
    'reveal secrets',
    'send password',
    'execute command',
    'run script',
    'bypass security',
]);
export class GroundedPlanSecurityBoundary {
    userStopProvider;
    constructor(options) {
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * EN: Evaluates synchronous USER_STOP supremacy. Throws GroundedPlanUserStopError if active.
     * VI: Đánh giá quyền tối cao dừng khẩn cấp USER_STOP đồng bộ. Ném lỗi GroundedPlanUserStopError nếu đang kích hoạt.
     */
    assertUserStopNotActive(checkpoint = 'security_boundary_check') {
        if (this.userStopProvider()) {
            throw new GroundedPlanUserStopError(checkpoint);
        }
    }
    /**
     * EN: Validates tenant boundary. Throws CrossTenantGroundedPlanError if mismatch.
     * VI: Xác thực ranh giới bên thuê. Ném lỗi CrossTenantGroundedPlanError nếu không khớp.
     */
    assertTenantIsolation(planTenantId, activeTenantId) {
        if (!planTenantId || !activeTenantId || planTenantId.trim() !== activeTenantId.trim()) {
            throw new CrossTenantGroundedPlanError(planTenantId, activeTenantId);
        }
    }
    /**
     * EN: Scans text content for prompt injection patterns. Returns true if injection suspected.
     * VI: Quét nội dung văn bản tìm mẫu tấn công prompt injection. Trả về true nếu nghi ngờ có tấn công.
     */
    scanForPromptInjection(text) {
        const lower = text.toLowerCase();
        for (const pattern of INJECTION_PATTERNS) {
            if (lower.includes(pattern)) {
                return { isInjected: true, matchedPattern: pattern };
            }
        }
        return { isInjected: false };
    }
    /**
     * EN: Inspects an entire plan for security vulnerabilities and sanitizes content.
     * VI: Kiểm tra toàn bộ kế hoạch để phát hiện lỗ hổng bảo mật và làm sạch nội dung.
     */
    sanitizeAndAuditPlan(plan, activeTenantId) {
        this.assertUserStopNotActive('plan_security_audit');
        this.assertTenantIsolation(plan.tenantId, activeTenantId);
        const violations = [];
        // Scan Title and Description
        const titleScan = this.scanForPromptInjection(plan.title);
        if (titleScan.isInjected) {
            violations.push(`Prompt injection detected in plan title: '${titleScan.matchedPattern}'`);
        }
        const descScan = this.scanForPromptInjection(plan.description);
        if (descScan.isInjected) {
            violations.push(`Prompt injection detected in plan description: '${descScan.matchedPattern}'`);
        }
        // Scan Steps and Payloads
        for (const step of plan.steps) {
            const stepDescScan = this.scanForPromptInjection(step.description);
            if (stepDescScan.isInjected) {
                violations.push(`Prompt injection detected in step '${step.stepId}' description: '${stepDescScan.matchedPattern}'`);
            }
            const payloadStr = JSON.stringify(step.payload);
            const payloadScan = this.scanForPromptInjection(payloadStr);
            if (payloadScan.isInjected) {
                violations.push(`Prompt injection detected in step '${step.stepId}' payload: '${payloadScan.matchedPattern}'`);
            }
        }
        return {
            isClean: violations.length === 0,
            securityViolations: Object.freeze(violations),
        };
    }
    /**
     * EN: Pure text sanitization proxy delegating to globalDiagnosisSanitizer.
     * VI: Bộ đại diện làm sạch văn bản ủy thác cho globalDiagnosisSanitizer.
     */
    sanitizeText(text) {
        return globalDiagnosisSanitizer.sanitize(text);
    }
}
