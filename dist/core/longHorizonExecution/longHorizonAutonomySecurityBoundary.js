// src/core/longHorizonExecution/longHorizonAutonomySecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON AUTONOMY SECURITY BOUNDARY
// Component 1084 — REAL
//
// EN: Authoritative security boundary for long-horizon autonomous orchestration.
//     Enforces synchronous 11-checkpoint USER_STOP supremacy, isolation, and sanitization.
// VI: Ranh giới bảo mật có thẩm quyền cho điều phối tự chủ tầm nhìn dài.
//     Thực thi quyền tối cao của USER_STOP đồng bộ tại 11 điểm kiểm tra, cô lập và khử trùng.
import { LongHorizonUserStopError, LongHorizonTenantIsolationError, LongHorizonSessionIsolationError, LongHorizonSecurityBoundaryError, } from './longHorizonExecutionTypes.js';
import { LongHorizonExecutionValidator } from './longHorizonExecutionValidator.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class LongHorizonAutonomySecurityBoundary {
    userStopProvider;
    constructor(options) {
        this.userStopProvider =
            options?.userStopProvider ??
                (() => {
                    const val = globalMasterHumanAuthority.isUserStopActive;
                    return typeof val === 'function' ? val.call(globalMasterHumanAuthority) : Boolean(val);
                });
    }
    /**
     * EN: Synchronously asserts USER_STOP at an exact long-horizon lifecycle checkpoint.
     * VI: Khẳng định đồng bộ USER_STOP tại một điểm kiểm tra vòng đời tầm nhìn dài chính xác.
     */
    assertUserStop(checkpoint) {
        if (this.userStopProvider()) {
            throw new LongHorizonUserStopError(checkpoint);
        }
    }
    assertUserStopInactive(checkpoint) {
        this.assertUserStop(checkpoint);
    }
    /**
     * EN: Asserts strict tenant and session isolation across operations.
     * VI: Khẳng định sự cô lập nghiêm ngặt giữa các bên thuê và phiên làm việc.
     */
    assertIsolation(expectedTenantId, expectedSessionId, actualTenantId, actualSessionId) {
        if (!expectedTenantId || !actualTenantId || expectedTenantId.trim() !== actualTenantId.trim()) {
            throw new LongHorizonTenantIsolationError(expectedTenantId, actualTenantId);
        }
        if (!expectedSessionId || !actualSessionId || expectedSessionId.trim() !== actualSessionId.trim()) {
            throw new LongHorizonSessionIsolationError(expectedSessionId, actualSessionId);
        }
    }
    enforceTenantSessionIsolation(expectedTenantId, expectedSessionId, actualTenantId, actualSessionId) {
        this.assertIsolation(expectedTenantId, expectedSessionId, actualTenantId, actualSessionId);
    }
    enforceObjectiveScope(objective, requestedScope) {
        for (const scope of requestedScope) {
            if (!objective.authorizationScope.includes(scope)) {
                throw new LongHorizonSecurityBoundaryError(`Scope "${scope}" exceeds authorized scope [${objective.authorizationScope.join(', ')}]`);
            }
        }
    }
    quarantineUntrustedText(text) {
        return `UNTRUSTED_SCREEN_TEXT: ${text}`;
    }
    isQuarantined(text) {
        return typeof text === 'string' && text.startsWith('UNTRUSTED_SCREEN_TEXT:');
    }
    sanitizeSecrets(payload) {
        if (payload === null || payload === undefined) {
            return payload;
        }
        return this.deepScrub(payload);
    }
    /**
     * EN: Resolves safe user partition directory preventing directory traversal attacks.
     * VI: Phân giải thư mục phân vùng người dùng an toàn, ngăn chặn tấn công duyệt thư mục.
     */
    resolveSafePartition(tenantId, baseDir) {
        if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\')) {
            throw new LongHorizonTenantIsolationError('valid_tenant_id', tenantId);
        }
        return resolveUserPartition(tenantId.trim(), baseDir);
    }
    /**
     * EN: Sanitizes arbitrary objects or payloads before persistence or audit logging.
     * VI: Khử trùng các đối tượng hoặc tải trọng tùy ý trước khi lưu trữ hoặc ghi nhật ký kiểm toán.
     */
    sanitizePayload(payload) {
        if (payload === null || payload === undefined) {
            return payload;
        }
        // Validate against prototype pollution, injection, and CoT leakage
        LongHorizonExecutionValidator.sanitizeAndValidateData(payload, 'sanitizationTarget');
        // Deep sanitize via globalDiagnosisSanitizer
        const sanitized = globalDiagnosisSanitizer.sanitize(payload);
        // Deep scrub textual passwords and PII patterns
        return this.deepScrub(sanitized);
    }
    scrubString(str) {
        let result = str;
        // Scrub API keys (e.g. sk-abcdef...)
        result = result.replace(/sk-[a-zA-Z0-9_-]{20,}/gi, '[REDACTED_API_KEY]');
        // Scrub Bearer tokens
        result = result.replace(/bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED_TOKEN]');
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
                const lowerKey = k.toLowerCase();
                if (typeof v === 'string' && (lowerKey.includes('apikey') || lowerKey === 'key' || lowerKey.includes('secret') || lowerKey.includes('token'))) {
                    out[k] = '[REDACTED_API_KEY]';
                }
                else if (typeof v === 'string' && lowerKey.includes('email')) {
                    out[k] = '[REDACTED_EMAIL]';
                }
                else {
                    out[k] = this.deepScrub(v);
                }
            }
            return out;
        }
        return obj;
    }
}
export const globalLongHorizonSecurityBoundary = new LongHorizonAutonomySecurityBoundary();
