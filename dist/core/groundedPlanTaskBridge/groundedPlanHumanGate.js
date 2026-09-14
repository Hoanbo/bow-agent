// src/core/groundedPlanTaskBridge/groundedPlanHumanGate.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN HUMAN GATE
// Component 1052 — REAL
//
// EN: Authoritative human confirmation gate requiring genuine MasterHumanAuthority
//     token validation, anti-replay defense, freshness checks, and zero self-approval.
// VI: Cổng xác nhận con người có thẩm quyền yêu cầu xác thực token chính thức từ
//     MasterHumanAuthority, phòng thủ chống phát lại, kiểm tra độ tươi và cấm tự phê duyệt.
import crypto from 'node:crypto';
import { globalMasterHumanAuthority, } from '../authority/masterHumanAuthority.js';
import { HUMAN_TOKEN_TTL_MS, GroundedPlanTaskUserStopError, GroundedPlanTaskHumanConfirmationError, computeHumanConfirmationSignature, } from './groundedPlanTaskTypes.js';
export class GroundedPlanHumanGate {
    masterAuthority;
    userStopProvider;
    tokenTtlMs;
    consumedTokens = new Set();
    constructor(options) {
        this.masterAuthority = options?.masterAuthority ?? globalMasterHumanAuthority;
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this.tokenTtlMs = options?.tokenTtlMs ?? HUMAN_TOKEN_TTL_MS;
    }
    /**
     * EN: Evaluates whether the plan task binding requires authoritative human confirmation.
     * VI: Đánh giá xem ràng buộc nhiệm vụ kế hoạch có bắt buộc xác nhận từ con người hay không.
     */
    requiresConfirmation(binding) {
        if (binding.requiresHumanConfirmation)
            return true;
        if (binding.riskLevel === 'CRITICAL' || binding.riskLevel === 'HIGH')
            return true;
        for (const step of binding.stepBindings) {
            if (step.requiresApproval || step.isQuarantinedText)
                return true;
            if (step.riskLevel === 'CRITICAL' || step.riskLevel === 'HIGH')
                return true;
        }
        return false;
    }
    /**
     * EN: Creates a formal human confirmation request review envelope.
     * VI: Tạo phong bì xem xét yêu cầu xác nhận chính thức từ con người.
     */
    createConfirmationRequest(binding) {
        if (this.userStopProvider()) {
            throw new GroundedPlanTaskUserStopError('create_confirmation_request');
        }
        const now = Date.now();
        const requestId = `req_hc_${crypto.createHash('sha256').update(`${binding.bindingId}_${now}`).digest('hex').slice(0, 16)}`;
        const sensitiveActionsSummary = [];
        for (const step of binding.stepBindings) {
            if (step.requiresApproval || step.riskLevel === 'HIGH' || step.riskLevel === 'CRITICAL') {
                sensitiveActionsSummary.push(`[Step ${step.stepIndex}] ${step.taskStepOptions.capabilityId}:${step.taskStepOptions.actionName} - Risk: ${step.riskLevel}`);
            }
        }
        return Object.freeze({
            requestId,
            bindingId: binding.bindingId,
            tenantId: binding.tenantId,
            sessionId: binding.sessionId,
            planId: binding.sourcePlanId,
            planProvenanceHash: binding.sourcePlanProvenanceHash,
            riskLevel: binding.riskLevel,
            sensitiveActionsSummary: Object.freeze(sensitiveActionsSummary),
            requestedAt: new Date(now).toISOString(),
            expiresAt: new Date(now + this.tokenTtlMs).toISOString(),
        });
    }
    /**
     * EN: Issues an authoritative human confirmation token signed by MasterHumanAuthority.
     * VI: Cấp mã xác nhận con người có thẩm quyền được ký bởi MasterHumanAuthority.
     */
    issueConfirmationToken(request, operatorId) {
        if (this.userStopProvider()) {
            throw new GroundedPlanTaskUserStopError('issue_confirmation_token');
        }
        // 1. Operator Authority Verification
        if (!this.masterAuthority.isMasterOperator(operatorId)) {
            throw new GroundedPlanTaskHumanConfirmationError(`Operator "${operatorId}" is NOT authorized as Master Human Authority. Self-approval / unauthorized issuance forbidden.`);
        }
        const now = Date.now();
        const expiresAtNum = Date.parse(request.expiresAt);
        if (now > expiresAtNum) {
            throw new GroundedPlanTaskHumanConfirmationError('Confirmation request has expired');
        }
        const confirmationId = `hc_${crypto.createHash('sha256').update(`${request.requestId}_${now}_${operatorId}`).digest('hex').slice(0, 16)}`;
        const rawTokenPayload = `${confirmationId}:${request.bindingId}:${request.tenantId}:${request.sessionId}:${request.planProvenanceHash}:${operatorId}:${now}`;
        const token = `tok_${crypto.createHash('sha256').update(rawTokenPayload).digest('hex')}`;
        const partialRecord = {
            confirmationId,
            bindingId: request.bindingId,
            tenantId: request.tenantId,
            sessionId: request.sessionId,
            planId: request.planId,
            planProvenanceHash: request.planProvenanceHash,
            operatorId,
            token,
            confirmedAt: new Date(now).toISOString(),
            expiresAt: request.expiresAt,
        };
        const signatureHash = computeHumanConfirmationSignature(partialRecord);
        return Object.freeze({
            ...partialRecord,
            signatureHash,
        });
    }
    /**
     * EN: Validates and consumes an authoritative HumanConfirmationRecord against a binding.
     * VI: Xác thực và tiêu thụ một HumanConfirmationRecord có thẩm quyền đối với một ràng buộc.
     */
    validateAndConsumeConfirmation(confirmation, binding) {
        if (this.userStopProvider()) {
            throw new GroundedPlanTaskUserStopError('validate_and_consume_confirmation');
        }
        // 1. Anti-Replay Check
        if (this.consumedTokens.has(confirmation.token)) {
            throw new GroundedPlanTaskHumanConfirmationError(`Human confirmation token "${confirmation.token}" has already been consumed (anti-replay violation)`);
        }
        // 2. Freshness Check
        const now = Date.now();
        const expiresAt = Date.parse(confirmation.expiresAt);
        if (now > expiresAt) {
            throw new GroundedPlanTaskHumanConfirmationError('Human confirmation token has expired');
        }
        // 3. Binding Match Checks
        if (confirmation.bindingId !== binding.bindingId) {
            throw new GroundedPlanTaskHumanConfirmationError(`Confirmation bindingId mismatch: expected "${binding.bindingId}", got "${confirmation.bindingId}"`);
        }
        if (confirmation.tenantId !== binding.tenantId) {
            throw new GroundedPlanTaskHumanConfirmationError(`Confirmation tenantId mismatch: expected "${binding.tenantId}", got "${confirmation.tenantId}"`);
        }
        if (confirmation.sessionId !== binding.sessionId) {
            throw new GroundedPlanTaskHumanConfirmationError(`Confirmation sessionId mismatch: expected "${binding.sessionId}", got "${confirmation.sessionId}"`);
        }
        if (confirmation.planId !== binding.sourcePlanId) {
            throw new GroundedPlanTaskHumanConfirmationError(`Confirmation planId mismatch: expected "${binding.sourcePlanId}", got "${confirmation.planId}"`);
        }
        if (confirmation.planProvenanceHash !== binding.sourcePlanProvenanceHash) {
            throw new GroundedPlanTaskHumanConfirmationError('Confirmation plan provenance hash mismatch; underlying plan has mutated since review');
        }
        // 4. Operator Authority Check
        if (!this.masterAuthority.isMasterOperator(confirmation.operatorId)) {
            throw new GroundedPlanTaskHumanConfirmationError(`Operator "${confirmation.operatorId}" is not authentic Master Human Authority`);
        }
        // 5. Cryptographic Signature Verification
        const expectedSig = computeHumanConfirmationSignature({
            confirmationId: confirmation.confirmationId,
            bindingId: confirmation.bindingId,
            tenantId: confirmation.tenantId,
            sessionId: confirmation.sessionId,
            planId: confirmation.planId,
            planProvenanceHash: confirmation.planProvenanceHash,
            operatorId: confirmation.operatorId,
            token: confirmation.token,
            confirmedAt: confirmation.confirmedAt,
            expiresAt: confirmation.expiresAt,
        });
        if (confirmation.signatureHash !== expectedSig) {
            throw new GroundedPlanTaskHumanConfirmationError('Cryptographic signature tampering detected on HumanConfirmationRecord');
        }
        // 6. Mark token as consumed
        this.consumedTokens.add(confirmation.token);
    }
    /**
     * EN: Clears consumed tokens cache (e.g. on session termination or testing).
     * VI: Xóa bộ đệm token đã tiêu thụ (ví dụ khi kết thúc phiên hoặc thử nghiệm).
     */
    resetConsumedTokens() {
        this.consumedTokens.clear();
    }
}
