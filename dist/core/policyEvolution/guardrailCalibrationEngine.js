// src/core/policyEvolution/guardrailCalibrationEngine.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Governed guardrail margin calibration and safety invariant verifier.
// Evaluates candidate policy proposals and counterfactual simulation results to verify that
// operational speed improvements do not erode fundamental safety invariants or forbidden action boundaries.
// Authority Invariant: Level 0 Read-Only Analysis ONLY.
// Zero policy mutation, zero safety compromise.
// Động cơ hiệu chuẩn biên giới bảo vệ và xác minh bất biến an toàn có quản trị.
// Đánh giá các đề xuất chính sách và kết quả mô phỏng phản thực tế để đảm bảo rằng
// việc cải thiện tốc độ vận hành không làm xói mòn các bất biến an toàn cốt lõi hay ranh giới hành động bị cấm.
export class GuardrailCalibrationEngine {
    static HARD_FORBIDDEN_ACTIONS = [
        'transfer_funds',
        'delete_database',
        'bypass_robot_interlocks',
        'execute_untrusted_host_script',
    ];
    /**
     * Calibrates and validates guardrails for a proposed policy change against counterfactual evidence.
     * Rejects proposals that degrade safety even if they improve operational MTTR.
     * Hiệu chuẩn và xác thực các biên giới bảo vệ cho đề xuất chính sách so với bằng chứng phản thực tế.
     */
    calibrateGuardrails(proposal, simulationResult) {
        const rejectionReasons = [];
        let violatesForbiddenProtection = false;
        let violatesGateStrictness = false;
        let erosionDetected = false;
        const modified = proposal.candidatePolicyDiff.modifiedClassifications;
        const added = proposal.candidatePolicyDiff.addedClassifications;
        const allChanges = { ...added, ...modified };
        // 1. Defend hard forbidden barriers: FORBIDDEN actions can NEVER be reclassified
        for (const [actionName, newClass] of Object.entries(allChanges)) {
            if (GuardrailCalibrationEngine.HARD_FORBIDDEN_ACTIONS.includes(actionName)) {
                if (newClass !== 'FORBIDDEN') {
                    violatesForbiddenProtection = true;
                    rejectionReasons.push(`FORBIDDEN_PROTECTION_BREACH: Action '${actionName}' is hardcoded FORBIDDEN and can never be reclassified to '${newClass}'.`);
                }
            }
        }
        // 2. Defend against safety regressions detected during counterfactual simulation
        if (simulationResult.simulatedSafetyRegressionsCount > 0) {
            erosionDetected = true;
            rejectionReasons.push(`SAFETY_REGRESSION_DETECTED: Counterfactual simulation projected ${simulationResult.simulatedSafetyRegressionsCount} safety regressions.`);
        }
        // 3. Defend gate strictness: guardrail timeout relaxation defense
        const guardrails = proposal.candidatePolicyDiff.modifiedGuardrails;
        if (guardrails.minApprovalTimeoutMs !== undefined && guardrails.minApprovalTimeoutMs < 5000) {
            violatesGateStrictness = true;
            rejectionReasons.push(`GATE_STRICTNESS_VIOLATION: minApprovalTimeoutMs cannot be reduced below 5000ms (proposed: ${guardrails.minApprovalTimeoutMs}ms).`);
        }
        if (guardrails.maxRetries !== undefined && guardrails.maxRetries > 10) {
            erosionDetected = true;
            rejectionReasons.push(`EXCESSIVE_RETRY_EXPANSION: maxRetries cannot exceed 10 (proposed: ${guardrails.maxRetries}).`);
        }
        // 4. Calculate safety margin score [0.0, 1.0]
        let safetyMarginScore = 1.0;
        if (violatesForbiddenProtection)
            safetyMarginScore = 0.0;
        else if (erosionDetected)
            safetyMarginScore -= 0.4;
        else if (violatesGateStrictness)
            safetyMarginScore -= 0.3;
        safetyMarginScore = Math.max(0.0, Math.min(1.0, safetyMarginScore));
        const passed = rejectionReasons.length === 0 && safetyMarginScore >= 0.7;
        return {
            passed,
            safetyMarginScore,
            violatesForbiddenProtection,
            violatesGateStrictness,
            erosionDetected,
            rejectionReasons: Object.freeze(rejectionReasons),
            calibratedAt: Date.now(),
        };
    }
}
