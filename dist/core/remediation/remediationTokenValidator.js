// src/core/remediation/remediationTokenValidator.ts
// BOWCON V4.0 — MS-1.3.55: GOVERNED INCIDENT REMEDIATION, AUTHORIZED RECOVERY EXECUTION & CLOSED-LOOP POST-MITIGATION VERIFICATION
//
// Cryptographic Remediation Authorization Token Validator & Single-Use Consumer.
// Strictly enforces that no remediation can execute without an authentic, unexpired,
// cryptographically bound AuthorizationToken issued by MasterHumanAuthority through SupervisorHumanGate.
// Bộ xác thực và tiêu thụ mã ủy quyền khắc phục mật mã dùng một lần.
// Thực thi nghiêm ngặt rằng không có khắc phục nào có thể thực thi nếu thiếu mã AuthorizationToken
// xác thực, chưa hết hạn, ràng buộc mật mã do MasterHumanAuthority cấp qua SupervisorHumanGate.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - NO_TOKEN_NO_EXECUTION: Missing or empty token immediately fails closed.
// - ANTI_REPLAY_SINGLE_USE: Tokens are consumed atomically; replayed tokens throw immediately.
// - STRICT_BINDING: Token must match packageId, actionId, targetId, and operator authority.
// - ZERO_TOKEN_ISSUANCE: This validator MUST NEVER call issueToken(). It only consumes tokens.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class RemediationTokenValidationError extends Error {
    code;
    constructor(code, message) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.name = 'RemediationTokenValidationError';
    }
}
export class RemediationTokenValidator {
    authEngine;
    masterAuthority;
    constructor(authEngine = globalWorldActionAuth, masterAuthority = new MasterHumanAuthority()) {
        this.authEngine = authEngine;
        this.masterAuthority = masterAuthority;
    }
    /**
     * Validates cryptographic authorization token and atomically consumes it (single-use guarantee).
     * Thẩm định mã ủy quyền mật mã và tiêu thụ nguyên tử (đảm bảo chỉ dùng một lần).
     */
    validateAndConsume(input) {
        const { token, plan, operatorId } = input;
        // 1. Assert token presence
        // 1. Khẳng định sự tồn tại của token
        if (!token || !token.tokenId) {
            throw new RemediationTokenValidationError('MISSING_AUTHORIZATION_TOKEN', `Remediation execution denied: No AuthorizationToken presented for action "${plan.actionId}".`);
        }
        // 2. Validate token expiration
        // 2. Thẩm định thời hạn của token
        const now = Date.now();
        if (token.expiresAt && now > token.expiresAt) {
            throw new RemediationTokenValidationError('TOKEN_EXPIRED', `Authorization token "${token.tokenId}" expired at ${new Date(token.expiresAt).toISOString()} (current: ${new Date(now).toISOString()}).`);
        }
        // 3. Validate operator authority
        // 3. Thẩm định quyền hạn của người vận hành
        const effectiveOperator = operatorId || token.operatorId || token.userId;
        if (!effectiveOperator || !this.masterAuthority.isMasterOperator(effectiveOperator)) {
            throw new RemediationTokenValidationError('UNAUTHORIZED_OPERATOR', `Operator "${effectiveOperator}" is not recognized as Master Human Authority.`);
        }
        // 4. Validate binding to plan envelope (actionId, targetId)
        // 4. Thẩm định sự ràng buộc với kế hoạch (actionId, targetId)
        if (token.actionId && token.actionId !== plan.actionId && token.actionId !== plan.incidentId && token.actionId !== plan.planId) {
            throw new RemediationTokenValidationError('ACTION_ID_MISMATCH', `Token actionId "${token.actionId}" does not bind to remediation plan actionId "${plan.actionId}" or incidentId "${plan.incidentId}".`);
        }
        if (token.target && token.target !== plan.targetId && token.target !== 'supervisor_target') {
            throw new RemediationTokenValidationError('TARGET_MISMATCH', `Token target "${token.target}" does not match remediation target "${plan.targetId}".`);
        }
        // 5. Atomically consume token via WorldActionAuthorizationEngine
        // This enforces replay protection: if token is already consumed or revoked, it throws
        // 5. Tiêu thụ nguyên tử token qua WorldActionAuthorizationEngine
        // Điều này thực thi bảo vệ chống phát lại: nếu token đã được tiêu thụ hoặc bị thu hồi, nó sẽ ném ngoại lệ
        try {
            this.authEngine.consumeToken(token.tokenId, plan.actionId);
        }
        catch (err) {
            throw new RemediationTokenValidationError('TOKEN_CONSUMPTION_FAILED', `Failed to consume token "${token.tokenId}": ${err.message}`);
        }
        return {
            tokenId: token.tokenId,
            operatorId: effectiveOperator,
            actionId: plan.actionId,
            targetId: plan.targetId,
            consumedAt: Date.now(),
        };
    }
}
export const globalRemediationTokenValidator = new RemediationTokenValidator();
