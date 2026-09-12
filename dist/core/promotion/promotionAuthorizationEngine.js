// src/core/promotion/promotionAuthorizationEngine.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Canonical WorldActionAuthorization integration for promotion execution tokens.
// Tích hợp WorldActionAuthorization chuẩn tắc cho các mã ủy quyền thực thi xúc tiến.
//
// STRICT INVARIANTS:
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - CAPABILITY != AUTHORIZATION
// - PROMOTION != AUTHORIZATION
// - SINGLE_USE_TOKEN == STRICT
// - ZERO DUPLICATE TOKEN STORE
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import { PromotionError, } from './promotionTypes.js';
import { globalWorldActionAuth, } from '../world-action/worldActionAuthorization.js';
import { hashParameters } from '../world-action/worldActionTypes.js';
import { PromotionScopeValidator } from './promotionScopeValidator.js';
export class PromotionAuthorizationEngine {
    authEngine;
    constructor(authEngine = globalWorldActionAuth) {
        this.authEngine = authEngine;
    }
    /**
     * Issues an execution authorization token for an approved promotion proposal.
     * Cấp mã ủy quyền thực thi cho một đề xuất xúc tiến đã được phê duyệt.
     */
    issuePromotionToken(input) {
        // 1. Enforce that proposal cannot exceed authorized scope.
        // 1. Thực thi việc đề xuất không thể vượt quá phạm vi được ủy quyền.
        PromotionScopeValidator.assertNotProtectedWorkspace(input.proposal.targetProjectRoot);
        // 2. Enforce that approval must be APPROVED.
        // 2. Thực thi việc phê duyệt phải ở trạng thái APPROVED.
        if (input.approval.decision !== 'APPROVED') {
            throw new PromotionError('PROMOTION_NOT_APPROVED', `Cannot issue token for promotion "${input.proposal.promotionId}" with decision "${input.approval.decision}".`);
        }
        if (input.approval.promotionId !== input.proposal.promotionId) {
            throw new PromotionError('APPROVAL_MISMATCH', `Approval record promotionId "${input.approval.promotionId}" does not match proposal "${input.proposal.promotionId}".`);
        }
        // 3. Issue cryptographically bound token via canonical WorldActionAuthorization.
        // 3. Cấp mã được gắn kết mã hóa thông qua WorldActionAuthorization chuẩn tắc.
        const token = this.authEngine.issueToken({
            actionId: `promote_${input.proposal.promotionId}`,
            userId: input.operatorId,
            operatorId: input.operatorId,
            sessionId: input.proposal.sessionId,
            deviceId: input.proposal.deviceId,
            taskId: input.proposal.taskId,
            toolId: 'controlled_promotion_engine',
            capability: 'project_mutation_promotion',
            target: input.proposal.targetProjectRoot,
            parameters: {
                promotionId: input.proposal.promotionId,
                diffHash: input.proposal.diffHash,
                manifestHash: input.proposal.currentManifestHash,
                changesCount: input.proposal.proposedChanges.length,
            },
            riskLevel: 'HIGH',
            ttlMs: input.ttlMs ?? 600000, // 10 minutes default
            singleUse: true,
        });
        return token;
    }
    /**
     * Validates that an authorization token is valid and legally authorizes the promotion action.
     * Xác thực rằng mã ủy quyền hợp lệ và cấp quyền hợp pháp cho hành động xúc tiến.
     */
    validatePromotionToken(token, proposal) {
        const params = {
            promotionId: proposal.promotionId,
            diffHash: proposal.diffHash,
            manifestHash: proposal.currentManifestHash,
            changesCount: proposal.proposedChanges.length,
        };
        const action = {
            actionId: `promote_${proposal.promotionId}`,
            requestId: `req_${proposal.promotionId}`,
            traceId: `trace_${proposal.promotionId}`,
            tenantId: 'bowcon_tenant',
            deviceId: proposal.deviceId,
            sessionId: proposal.sessionId,
            userId: token.operatorId || token.userId,
            actionType: 'project_mutation_promotion',
            target: proposal.targetProjectRoot,
            parameters: params,
            parametersHash: hashParameters(params),
            riskLevel: 'HIGH',
            authorizationState: 'AUTHORIZED',
            executionState: 'PREPARED',
            verificationState: 'UNVERIFIED',
            lifecycleState: 'AUTHORIZED',
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000,
            idempotencyKey: `idemp_${proposal.promotionId}`,
            isDryRun: false,
            metadata: {},
        };
        const result = this.authEngine.validateToken(token, action, {
            sessionId: proposal.sessionId,
            taskId: proposal.taskId,
            deviceId: proposal.deviceId,
            target: proposal.targetProjectRoot,
            parameters: action.parameters,
        });
        return result.valid;
    }
}
