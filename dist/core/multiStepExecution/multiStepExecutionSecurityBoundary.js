// src/core/multiStepExecution/multiStepExecutionSecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.10: MULTI-STEP EXECUTION SECURITY BOUNDARY
// Component 1075 — REAL
//
// EN: Authoritative security boundary for governed multi-step execution.
//     Enforces synchronous 9-checkpoint USER_STOP supremacy, tenant/session isolation,
//     secret/PII sanitization via DiagnosisSanitizer, and prompt-injection quarantine.
// VI: Ranh giới bảo mật có thẩm quyền cho việc thực thi nhiều bước có quản trị.
//     Thực thi quyền tối cao của USER_STOP đồng bộ tại 9 điểm kiểm tra, cô lập tenant/phiên,
//     khử trùng bí mật/PII qua DiagnosisSanitizer và cách ly tiêm nhiễm prompt.
import { MultiStepExecutionUserStopError, MultiStepExecutionTenantIsolationError, MultiStepExecutionSessionIsolationError, } from './multiStepExecutionTypes.js';
import { MultiStepExecutionValidator } from './multiStepExecutionValidator.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class MultiStepExecutionSecurityBoundary {
    userStopProvider;
    constructor(options) {
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * EN: Synchronously asserts USER_STOP at an exact lifecycle checkpoint.
     * VI: Khẳng định đồng bộ USER_STOP tại một điểm kiểm tra vòng đời chính xác.
     */
    assertUserStop(checkpoint) {
        if (this.userStopProvider()) {
            throw new MultiStepExecutionUserStopError(checkpoint);
        }
    }
    /**
     * EN: Asserts strict tenant and session isolation across operations.
     * VI: Khẳng định sự cô lập nghiêm ngặt giữa các bên thuê và phiên làm việc.
     */
    assertIsolation(expectedTenantId, expectedSessionId, actualTenantId, actualSessionId) {
        if (!expectedTenantId || !actualTenantId || expectedTenantId.trim() !== actualTenantId.trim()) {
            throw new MultiStepExecutionTenantIsolationError(`Security boundary tenant breach: expected "${expectedTenantId}", received "${actualTenantId}"`);
        }
        if (!expectedSessionId || !actualSessionId || expectedSessionId.trim() !== actualSessionId.trim()) {
            throw new MultiStepExecutionSessionIsolationError(`Security boundary session breach: expected "${expectedSessionId}", received "${actualSessionId}"`);
        }
    }
    /**
     * EN: Sanitizes arbitrary objects or payloads before persistence or audit logging.
     * VI: Khử trùng các đối tượng hoặc tải trọng tùy ý trước khi lưu trữ hoặc ghi nhật ký kiểm toán.
     */
    sanitizePayload(payload) {
        if (payload === null || payload === undefined) {
            return payload;
        }
        // First validate against prototype pollution, injection, and CoT leakage
        MultiStepExecutionValidator.sanitizeAndValidateData(payload, 'sanitizationTarget');
        // Deep sanitize via globalDiagnosisSanitizer
        const sanitized = globalDiagnosisSanitizer.sanitize(payload);
        // Deep scrub textual passwords and PII patterns
        return this.deepScrub(sanitized);
    }
    scrubString(str) {
        let result = str;
        // Scrub textual passwords (e.g. "password MySecretPass123!")
        result = result.replace(/(password\s*[:=]?\s*)([^\s,;'"!]+[!.]?)/gi, '$1[REDACTED]');
        // Scrub emails
        result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[REDACTED_EMAIL]');
        return result;
    }
    deepScrub(obj) {
        if (typeof obj === 'string') {
            return this.scrubString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map((x) => this.deepScrub(x));
        }
        if (obj !== null && typeof obj === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(obj)) {
                out[k] = this.deepScrub(v);
            }
            return out;
        }
        return obj;
    }
}
