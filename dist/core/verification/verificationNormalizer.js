// src/core/verification/verificationNormalizer.ts
// BOWCON V4.0 — MILESTONE 1.3.14: EXECUTION RESULT NORMALIZATION LAYER
//
// EN:
// Normalizes heterogeneous tool and runtime execution outputs into a uniform,
// sanitized observed state structure suitable for deterministic postcondition evaluation.
//
// VI:
// Chuẩn hóa các kết quả thực thi công cụ và runtime không đồng nhất thành cấu trúc
// trạng thái quan sát đồng nhất, đã được khử trùng, phù hợp cho việc đánh giá postcondition tất định.
import { computeEvidenceFingerprint } from './verificationFingerprint.js';
import { redactVerificationSecrets, hasVerificationPrototypePollution } from './verificationValidator.js';
/**
 * EN: Safely extracts a key-value record from raw tool output.
 * VI: Trích xuất an toàn bản ghi key-value từ output thô của công cụ.
 */
function extractObservedState(raw) {
    if (raw === null || raw === undefined) {
        return {};
    }
    if (typeof raw === 'object') {
        if (hasVerificationPrototypePollution(raw)) {
            return { security_warning: 'PROTOTYPE_POLLUTION_DETECTED' };
        }
        const outputObj = {};
        // If raw output has a nested data object, merge it
        const candidate = raw.data ?? raw.output ?? raw;
        if (typeof candidate === 'object' && candidate !== null) {
            for (const [key, val] of Object.entries(candidate)) {
                if (typeof val === 'string') {
                    outputObj[key] = redactVerificationSecrets(val);
                }
                else {
                    outputObj[key] = val;
                }
            }
        }
        // Also copy top-level fields from raw if candidate was a nested field
        if (candidate !== raw && typeof raw === 'object') {
            for (const [key, val] of Object.entries(raw)) {
                if (key !== 'data' && key !== 'output' && !(key in outputObj)) {
                    if (typeof val === 'string') {
                        outputObj[key] = redactVerificationSecrets(val);
                    }
                    else {
                        outputObj[key] = val;
                    }
                }
            }
        }
        return outputObj;
    }
    // Primitive value
    return {
        value: typeof raw === 'string' ? redactVerificationSecrets(raw) : raw,
    };
}
/**
 * EN: Normalizes an execution outcome into a strongly typed NormalizedExecutionResult.
 * VI: Chuẩn hóa kết quả thực thi thành NormalizedExecutionResult định kiểu chặt chẽ.
 */
export function normalizeExecutionResult(exec, toolName, actionName, fallbackRisk = 'LOW') {
    const rawCandidate = exec.output !== undefined ? exec.output : (exec.data !== undefined ? exec.data : exec);
    const observedState = extractObservedState(rawCandidate);
    let errorMessage;
    if (exec.error) {
        if (typeof exec.error === 'string') {
            errorMessage = redactVerificationSecrets(exec.error);
        }
        else if (typeof exec.error === 'object' && exec.error !== null) {
            const msg = exec.error.message;
            errorMessage = typeof msg === 'string' ? redactVerificationSecrets(msg) : JSON.stringify(exec.error);
        }
    }
    return Object.freeze({
        executionSucceeded: Boolean(exec.success),
        toolName,
        actionName,
        observedState: Object.freeze(observedState),
        rawOutput: exec.output ?? exec.data,
        error: errorMessage,
        risk: exec.riskLevel || fallbackRisk,
        executionDurationMs: exec.executionDurationMs ?? 0,
        executionFingerprint: exec.executionFingerprint,
    });
}
/**
 * EN: Converts normalized observed state entries into formal VerificationEvidence items.
 * VI: Chuyển đổi các mục trạng thái quan sát đã chuẩn hóa thành các mục Bằng chứng Xác minh chính thức.
 */
export function extractEvidenceFromState(observedState, timestamp) {
    const evidenceList = [];
    for (const [key, val] of Object.entries(observedState)) {
        const evidenceId = computeEvidenceFingerprint('EXECUTION_OUTPUT', key, val);
        evidenceList.push(Object.freeze({
            evidenceId,
            source: 'EXECUTION_OUTPUT',
            path: key,
            observedValue: val,
            matched: true,
            status: 'OBSERVED',
            timestamp,
        }));
    }
    return Object.freeze(evidenceList);
}
