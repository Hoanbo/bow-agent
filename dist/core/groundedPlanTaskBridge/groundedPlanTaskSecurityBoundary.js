// src/core/groundedPlanTaskBridge/groundedPlanTaskSecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN TASK SECURITY BOUNDARY
// Component 1055 — REAL
//
// EN: Security envelope enforcing secret/PII sanitization, prompt-injection quarantine,
//     strict tenant and session isolation, CoT prohibition, and synchronous USER_STOP.
// VI: Phong bì bảo mật thực thi khử khuẩn bí mật/PII, cách ly tiêm nhiễm prompt,
//     cô lập chặt chẽ bên thuê và phiên làm việc, cấm CoT và đồng bộ USER_STOP.
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { GroundedPlanTaskUserStopError, GroundedPlanTaskTenantIsolationError, GroundedPlanTaskSessionIsolationError, GroundedPlanTaskValidationError, } from './groundedPlanTaskTypes.js';
import { GroundedPlanTaskValidator } from './groundedPlanTaskValidator.js';
const SUSPICIOUS_INJECTION_PATTERNS = Object.freeze([
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /system\s+override/i,
    /you\s+are\s+now/i,
    /developer\s+message/i,
    /jailbreak/i,
    /reveal\s+secret/i,
    /send\s+password/i,
    /execute\s+command/i,
    /disable\s+safety/i,
    /bypass\s+policy/i,
]);
export class GroundedPlanTaskSecurityBoundary {
    sanitizer;
    userStopProvider;
    constructor(options) {
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * EN: Asserts tenant identity matches the authorized active partition.
     * VI: Khẳng định định danh bên thuê khớp với phân vùng hoạt động được ủy quyền.
     */
    assertTenantMatches(requestedTenant, activeTenant) {
        if (this.userStopProvider()) {
            throw new GroundedPlanTaskUserStopError('assert_tenant_matches');
        }
        if (!requestedTenant || !activeTenant || requestedTenant.trim() !== activeTenant.trim()) {
            throw new GroundedPlanTaskTenantIsolationError(requestedTenant, activeTenant);
        }
    }
    /**
     * EN: Asserts session identity matches active session.
     * VI: Khẳng định định danh phiên khớp với phiên hoạt động.
     */
    assertSessionMatches(requestedSession, activeSession) {
        if (this.userStopProvider()) {
            throw new GroundedPlanTaskUserStopError('assert_session_matches');
        }
        if (!requestedSession || !activeSession || requestedSession.trim() !== activeSession.trim()) {
            throw new GroundedPlanTaskSessionIsolationError(requestedSession, activeSession);
        }
    }
    /**
     * EN: Scans text for prompt injection patterns. Returns true if suspicious instruction detected.
     * VI: Quét văn bản để tìm mẫu tiêm prompt. Trả về true nếu phát hiện chỉ thị đáng ngờ.
     */
    detectPromptInjection(text) {
        if (!text || typeof text !== 'string')
            return false;
        for (const pattern of SUSPICIOUS_INJECTION_PATTERNS) {
            if (pattern.test(text)) {
                return true;
            }
        }
        return false;
    }
    /**
     * EN: Sanitizes secrets and sensitive tokens from arbitrary object payloads.
     * VI: Khử khuẩn bí mật và token nhạy cảm khỏi tải trọng đối tượng bất kỳ.
     */
    sanitizePayload(payload) {
        if (this.userStopProvider()) {
            throw new GroundedPlanTaskUserStopError('sanitize_payload');
        }
        if (!payload || typeof payload !== 'object')
            return payload;
        const errors = [];
        GroundedPlanTaskValidator.assertNoPrototypePollution(payload, errors, 'payload');
        GroundedPlanTaskValidator.assertNoForbiddenCoT(payload, errors, 'payload');
        if (errors.length > 0) {
            throw new GroundedPlanTaskValidationError('Security validation failed on payload', errors);
        }
        // Deep scrub secrets via DiagnosisSanitizer
        return this.sanitizer.sanitize(payload);
    }
}
