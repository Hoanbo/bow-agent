// src/core/execution/executionAuthorization.ts
// BOWCON V4.0 — MILESTONE 1.3.12: AUTHORITATIVE EXECUTION AUTHORIZATION GATE
//
// EN:
// Evaluates whether a tool execution request is explicitly authorized to execute (INV-1).
// Strictly enforces PDP boundary preservation (INV-2), approval requirements (INV-3),
// and blocks execution for all non-actionable or unapproved states.
//
// VI:
// Đánh giá xem một yêu cầu thực thi tool có được ủy quyền rõ ràng để chạy hay không (INV-1).
// Thực thi nghiêm ngặt việc bảo tồn ranh giới PDP (INV-2), yêu cầu phê duyệt (INV-3),
// và chặn thực thi đối với tất cả các trạng thái không thể hành động hoặc chưa được duyệt.
const RISK_HIERARCHY = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
};
const NON_EXECUTABLE_NAMES = new Set([
    'NO_ACTION',
    'RESPOND',
    'CLARIFY',
    'DEFER',
    'BLOCK',
    'WAITING_APPROVAL',
]);
/**
 * EN: Validates authorization before tool execution.
 * VI: Xác thực quyền ủy quyền trước khi thực thi công cụ.
 */
export function authorizeExecution(params) {
    const { request, registry, orchestrationStatus, decisionState, } = params;
    const actor = request.actor || {
        userId: request.userId || 'unknown',
        sessionId: request.sessionId || 'unknown',
    };
    const toolName = request.toolName || request.actionName || '';
    const args = request.args || request.parameters || {};
    const approvalMetadata = params.approvalMetadata || request.approvalMetadata;
    const governanceMetadata = request.governanceMetadata;
    // 1. Direct Non-Executable Tool Name Guard (Cases 1-5, INV-1)
    if (NON_EXECUTABLE_NAMES.has(toolName)) {
        return Object.freeze({
            authorized: false,
            reason: `State guard violated: "${toolName}" is not an executable tool.`,
            risk: 'LOW',
            executionFingerprint: request.executionFingerprint,
            toolName,
            actor,
        });
    }
    // 2. DecisionState Guard (INV-1)
    if (decisionState) {
        if (decisionState === 'NO_ACTION' || decisionState === 'RESPOND') {
            return Object.freeze({
                authorized: false,
                reason: `DECISION_STATE_NON_ACTIONABLE: Decision state "${decisionState}" does not permit tool execution.`,
                risk: 'LOW',
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
            });
        }
        if (decisionState === 'CLARIFY') {
            return Object.freeze({
                authorized: false,
                reason: 'CLARIFICATION_REQUIRED: Decision requires user clarification before execution can proceed.',
                risk: 'LOW',
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
            });
        }
        if (decisionState === 'DEFER') {
            return Object.freeze({
                authorized: false,
                reason: 'EXECUTION_DEFERRED: Decision has been deferred.',
                risk: 'LOW',
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
            });
        }
        if (decisionState === 'BLOCK') {
            return Object.freeze({
                authorized: false,
                reason: 'EXECUTION_BLOCKED: Decision was blocked fail-closed.',
                risk: 'CRITICAL',
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
            });
        }
    }
    // 3. OrchestrationStatus Guard (INV-1)
    if (orchestrationStatus) {
        const disallowedStatuses = [
            'BLOCKED',
            'CLARIFICATION_REQUIRED',
            'WAITING_APPROVAL',
            'DEFERRED',
            'REJECTED',
            'NO_ACTION',
        ];
        if (disallowedStatuses.includes(orchestrationStatus)) {
            return Object.freeze({
                authorized: false,
                reason: `ORCHESTRATION_STATUS_NOT_EXECUTABLE: Status "${orchestrationStatus}" is not authorized for execution.`,
                risk: 'LOW',
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
            });
        }
    }
    // 4. PDP Boundary Check (INV-2)
    if (governanceMetadata) {
        const pdpDecision = governanceMetadata.pdpDecision;
        if (pdpDecision === 'DENY' || pdpDecision === 'REJECT') {
            return Object.freeze({
                authorized: false,
                reason: 'PDP decision is DENY: execution forbidden by policy.',
                risk: 'CRITICAL',
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
            });
        }
    }
    // 5. Capability Allowlist Check (INV-6)
    const capability = registry.get(toolName);
    if (!capability) {
        return Object.freeze({
            authorized: false,
            reason: `UNKNOWN_CAPABILITY: Capability "${toolName}" is not registered in CapabilityRegistry or not found in registry.`,
            risk: 'HIGH',
            executionFingerprint: request.executionFingerprint,
            toolName,
            actor,
        });
    }
    const effectiveRisk = capability.risk;
    // 6. Risk Downgrade Check (INV-2)
    const declaredRisk = request.riskLevel || request.risk;
    if (declaredRisk && RISK_HIERARCHY[declaredRisk] && RISK_HIERARCHY[effectiveRisk]) {
        if (RISK_HIERARCHY[declaredRisk] < RISK_HIERARCHY[effectiveRisk]) {
            return Object.freeze({
                authorized: false,
                reason: `Risk downgrade detected: capability is ${effectiveRisk} but request declared ${declaredRisk}.`,
                risk: effectiveRisk,
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
            });
        }
    }
    // 7. Schema Parameter Completeness Validation
    const schemaValidation = registry.validate(toolName, args);
    if (!schemaValidation.valid) {
        return Object.freeze({
            authorized: false,
            reason: schemaValidation.errors.join('; '),
            risk: effectiveRisk,
            executionFingerprint: request.executionFingerprint,
            toolName,
            actor,
        });
    }
    // 8. Approval Verification for HIGH and CRITICAL Risk (INV-3, Cases 8 & 9)
    let approvalVerified = false;
    if (effectiveRisk === 'HIGH' || effectiveRisk === 'CRITICAL') {
        if (!approvalMetadata) {
            return Object.freeze({
                authorized: false,
                reason: `Approval token required: Action "${toolName}" carries ${effectiveRisk} risk and requires valid approval. Approval required.`,
                risk: effectiveRisk,
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
                approvalVerified: false,
            });
        }
        const approvedByUser = approvalMetadata.approvedBy || approvalMetadata.userId;
        // Cross-user approval rejection (INV-3, INV-5)
        if (approvedByUser && approvedByUser !== actor.userId) {
            return Object.freeze({
                authorized: false,
                reason: `Approval user mismatch: approved by "${approvedByUser}", but request user is "${actor.userId}".`,
                risk: effectiveRisk,
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
                approvalVerified: false,
            });
        }
        // Cross-session approval rejection (INV-3, INV-5)
        if (approvalMetadata.sessionId && approvalMetadata.sessionId !== actor.sessionId) {
            return Object.freeze({
                authorized: false,
                reason: `Approval session mismatch: approved session is "${approvalMetadata.sessionId}", but request session is "${actor.sessionId}".`,
                risk: effectiveRisk,
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
                approvalVerified: false,
            });
        }
        // Fingerprint mismatch rejection (INV-3)
        if (approvalMetadata.executionFingerprint && approvalMetadata.executionFingerprint !== request.executionFingerprint) {
            return Object.freeze({
                authorized: false,
                reason: 'APPROVAL_FINGERPRINT_MISMATCH: Approval token was issued for a different execution fingerprint.',
                risk: effectiveRisk,
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
                approvalVerified: false,
            });
        }
        if (approvalMetadata.approved === false) {
            return Object.freeze({
                authorized: false,
                reason: `UNAPPROVED_ACTION: Action "${toolName}" is explicitly not approved.`,
                risk: effectiveRisk,
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
                approvalVerified: false,
            });
        }
        const token = approvalMetadata.token || approvalMetadata.approvalToken || request.executionToken;
        if (!token && approvalMetadata.approved !== true) {
            return Object.freeze({
                authorized: false,
                reason: `Approval token required for ${effectiveRisk} risk action "${toolName}".`,
                risk: effectiveRisk,
                executionFingerprint: request.executionFingerprint,
                toolName,
                actor,
                approvalVerified: false,
            });
        }
        approvalVerified = true;
    }
    // 9. Execution Authorization Granted
    return Object.freeze({
        authorized: true,
        risk: effectiveRisk,
        executionFingerprint: request.executionFingerprint,
        toolName,
        actor,
        approvalVerified,
        requiredParameters: Object.freeze(capability.parameters.filter(p => p.required).map(p => p.name)),
    });
}
/**
 * EN: Class gate encapsulation for checking authorization against a registry.
 * VI: Lớp đóng gói cổng để kiểm tra ủy quyền dựa trên registry.
 */
export class ExecutionAuthorizationGate {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    authorize(request, options = {}) {
        return authorizeExecution({
            request,
            registry: this.registry,
            orchestrationStatus: options.orchestrationStatus,
            decisionState: options.decisionState,
            approvalMetadata: options.approvalMetadata || request.approvalMetadata,
        });
    }
}
