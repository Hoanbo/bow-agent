// src/core/orchestration/orchestrationResult.ts
// BOWCON V4.0 — MILESTONE 1.3.11: ORCHESTRATION RESULT FACTORY
//
// EN:
// Constructs defensively frozen OrchestrationResult structures.
// Guarantees immutability and complete accounting of governance requirements.
//
// VI:
// Xây dựng các cấu trúc OrchestrationResult được đóng băng phòng thủ.
// Đảm bảo tính bất biến và hạch toán đầy đủ các yêu cầu quản trị.
/**
 * EN: Creates an immutable OrchestrationResult from orchestration parameters.
 * VI: Tạo OrchestrationResult bất biến từ các tham số điều phối.
 */
export function buildOrchestrationResult(params) {
    const { success, status, decision, executionIntent, executionRequest, errors = [], reasons = [], clarificationQuestion, } = params;
    const requiresClarification = status === 'CLARIFICATION_REQUIRED' || decision.requiresClarification;
    return Object.freeze({
        success,
        status,
        executionIntent,
        executionRequest,
        governanceRequired: executionIntent ? executionIntent.governanceRequired : decision.governanceRequired,
        approvalRequired: executionIntent ? executionIntent.approvalRequired : decision.approvalRequired,
        riskLevel: decision.riskLevel || 'LOW',
        decisionState: decision.state,
        fingerprint: executionRequest?.executionFingerprint || decision.deterministicFingerprint || 'orch_uninitialized',
        errors: Object.freeze([...errors]),
        requiresClarification,
        clarificationQuestion: clarificationQuestion || decision.clarification?.reason,
        reasons: Object.freeze([...reasons]),
    });
}
