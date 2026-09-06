// src/core/orchestration/actionOrchestrator.ts
// BOWCON V4.0 — MILESTONE 1.3.11: AUTHORITATIVE ACTION ORCHESTRATOR
//
// EN:
// Pure orchestration bridge translating DecisionResult into governed ExecutionIntent and ExecutionRequest.
// Enforces INV-1 (Pure Decision/Execution Boundary), monotonic risk preservation,
// user/session isolation, and fail-closed gate evaluation without executing tools or bypassing PDP.
//
// VI:
// Cầu nối điều phối thuần túy chuyển dịch DecisionResult thành ExecutionIntent và ExecutionRequest có quản trị.
// Thực thi INV-1 (Ranh giới Quyết định/Thực thi Thuần túy), bảo tồn rủi ro đơn điệu,
// cô lập user/session, và đánh giá cổng fail-closed mà không tự thực thi tool hay bỏ qua PDP.
import { validateOrchestrationInput } from './orchestrationValidator.js';
import { createExecutionIntent } from './executionIntent.js';
import { createExecutionRequest } from './executionRequest.js';
import { evaluateExecutionGate } from './executionGate.js';
import { assertRiskNotDowngraded } from './executionPolicy.js';
import { buildOrchestrationResult } from './orchestrationResult.js';
export class ActionOrchestrator {
    /**
     * EN: Orchestrates a DecisionResult into an immutable, governed OrchestrationResult.
     * VI: Điều phối DecisionResult thành OrchestrationResult bất biến, có quản trị.
     */
    orchestrate(decision, context) {
        // 1. Rigorous Schema, Scope & Security Validation (Section 14 & 15)
        const validation = validateOrchestrationInput(decision, context);
        if (!validation.valid) {
            return buildOrchestrationResult({
                success: false,
                status: 'BLOCKED',
                decision,
                errors: validation.errors,
                reasons: Object.freeze(['Input validation failed: security anomaly or scope mismatch detected.']),
            });
        }
        const hasSelectedAction = Boolean(decision.selectedAction);
        // 2. Evaluate Execution Gate based on DecisionState and Risk (Section 10 & 20)
        const gate = evaluateExecutionGate(decision.state, decision.riskLevel, hasSelectedAction);
        // 3. Handle Non-Actionable or Clarification/Defer/Block States Immediately
        if (!gate.canProceedToGovernance || !decision.selectedAction) {
            return buildOrchestrationResult({
                success: gate.status !== 'BLOCKED' && gate.status !== 'REJECTED',
                status: gate.status,
                decision,
                reasons: Object.freeze([gate.reason]),
                clarificationQuestion: decision.clarification?.reason,
            });
        }
        // 4. Construct Immutable ExecutionIntent (Section 7)
        const intent = createExecutionIntent(decision, decision.selectedAction);
        // 5. Monotonic Risk Preservation Verification (Section 11)
        const riskCheck = assertRiskNotDowngraded(decision.riskLevel, intent.risk);
        if (!riskCheck.valid) {
            return buildOrchestrationResult({
                success: false,
                status: 'REJECTED',
                decision,
                errors: Object.freeze([riskCheck.reason || 'RISK_DOWNGRADE_DETECTED']),
                reasons: Object.freeze(['Monotonic risk violation: execution intent downgraded decision risk.']),
            });
        }
        // 6. Build Structured ExecutionRequest for PDP & ToolRegistry (Section 8)
        const request = createExecutionRequest(intent, gate.status);
        // 7. Return Immutable OrchestrationResult
        return buildOrchestrationResult({
            success: true,
            status: gate.status,
            decision,
            executionIntent: intent,
            executionRequest: request,
            reasons: Object.freeze([gate.reason]),
        });
    }
}
