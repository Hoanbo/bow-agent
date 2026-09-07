// src/core/verification/verificationService.ts
// BOWCON V4.0 — MILESTONE 1.3.14: AUTHORITATIVE EXECUTION VERIFICATION SERVICE
//
// EN:
// Authoritative, deterministic Verification Service for BOWCON BRAIN.
// Evaluates postcondition contracts against normalized execution outcomes without executing tools.
// Enforces: EXECUTION SUCCESS != TASK SUCCESS, multi-tenant isolation, immutability, and risk preservation.
//
// VI:
// Dịch vụ Xác minh có thẩm quyền, tất định cho BOWCON BRAIN.
// Đánh giá các hợp đồng postcondition dựa trên kết quả thực thi đã chuẩn hóa mà không thực thi công cụ.
// Thực thi: THÀNH CÔNG THỰC THI != THÀNH CÔNG TÁC VỤ, cô lập multi-tenant, tính bất biến và bảo toàn rủi ro.
import { evaluatePostcondition } from './postconditionEvaluator.js';
import { normalizeExecutionResult, extractEvidenceFromState } from './verificationNormalizer.js';
import { createVerificationResult } from './verificationResult.js';
import { computeVerificationFingerprint, computeVerificationFailureFingerprint, } from './verificationFingerprint.js';
import { validateVerificationScope, hasVerificationPrototypePollution, validateConfidence, assertVerificationRiskPreservation, redactVerificationSecrets, } from './verificationValidator.js';
export class VerificationService {
    historyStore = new Map();
    /**
     * EN: Returns the partition key for multi-tenant user/session scoping.
     * VI: Trả về khóa phân vùng để định phạm vi user/session multi-tenant.
     */
    getPartitionKey(userId, sessionId) {
        return `${userId}::${sessionId}`;
    }
    /**
     * EN: Evaluates an authoritative verification request and produces an immutable outcome.
     * VI: Đánh giá một yêu cầu xác minh có thẩm quyền và tạo ra kết quả bất biến.
     */
    verify(request) {
        const { userId, sessionId, toolName, actionName } = request;
        // 1. Multi-tenant Scope Validation
        validateVerificationScope(userId, sessionId);
        // 2. Prototype Pollution Defense
        if (hasVerificationPrototypePollution(request)) {
            const failureFingerprint = computeVerificationFailureFingerprint(userId, sessionId, 'SECURITY_FAILURE', 'Prototype pollution detected in verification request');
            return createVerificationResult({
                verificationId: failureFingerprint,
                userId,
                sessionId,
                toolName,
                actionName,
                status: 'FAILED',
                confidence: 1.0,
                riskLevel: request.riskLevel || 'CRITICAL',
                executionSucceeded: false,
                taskSucceeded: false,
                postconditionResults: [],
                evidence: [],
                summary: {
                    totalPostconditions: 0,
                    passedCount: 0,
                    failedCount: 0,
                    unknownCount: 0,
                    conflictingCount: 0,
                    allRequiredPassed: false,
                },
                failure: {
                    category: 'SECURITY_FAILURE',
                    message: 'Prototype pollution detected in verification request payload',
                    recoverable: false,
                    fingerprint: failureFingerprint,
                },
                recommendation: 'ABORT',
                fingerprint: failureFingerprint,
                verifiedAt: request.timestamp,
            });
        }
        // 3. Normalize Execution Outcome
        const normalized = normalizeExecutionResult(request.executionResult, toolName, actionName, request.riskLevel || 'LOW');
        // Enforce Risk Preservation
        if (request.riskLevel) {
            assertVerificationRiskPreservation(request.riskLevel, normalized.risk);
        }
        // 4. Extract Evidence
        const derivedEvidence = extractEvidenceFromState(normalized.observedState, request.timestamp);
        const combinedEvidence = [
            ...derivedEvidence,
            ...(request.contextEvidence || []),
        ];
        // 5. Evaluate Postconditions
        const postconditions = request.postconditions || [];
        const postconditionResults = [];
        let passedCount = 0;
        let failedCount = 0;
        let unknownCount = 0;
        let conflictingCount = 0;
        let requiredFailed = false;
        let criticalFailed = false;
        for (const postcondition of postconditions) {
            const result = evaluatePostcondition(postcondition, normalized.observedState);
            postconditionResults.push(result);
            if (result.status === 'PASSED') {
                passedCount++;
            }
            else if (result.status === 'FAILED') {
                failedCount++;
                if (result.required)
                    requiredFailed = true;
                if (result.priority === 'CRITICAL')
                    criticalFailed = true;
            }
            else if (result.status === 'UNKNOWN') {
                unknownCount++;
                if (result.required)
                    requiredFailed = true;
            }
            else if (result.status === 'CONFLICTING') {
                conflictingCount++;
                if (result.required)
                    requiredFailed = true;
            }
        }
        const summary = {
            totalPostconditions: postconditions.length,
            passedCount,
            failedCount,
            unknownCount,
            conflictingCount,
            allRequiredPassed: postconditions.length === 0 ? true : !requiredFailed && passedCount > 0,
        };
        // 6. Authoritative Decision Logic
        let status;
        let taskSucceeded = false;
        let failure;
        let recommendation = 'NONE';
        let rawConfidence = 0.5;
        // CASE 1: Tool execution itself failed
        if (!normalized.executionSucceeded) {
            status = 'FAILED';
            taskSucceeded = false;
            const safeMsg = redactVerificationSecrets(normalized.error || 'Underlying tool execution failed');
            failure = {
                category: 'EXECUTION_FAILURE',
                message: safeMsg,
                recoverable: true,
                fingerprint: computeVerificationFailureFingerprint(userId, sessionId, 'EXECUTION_FAILURE', safeMsg),
            };
            recommendation = 'RETRY_RECOMMENDED';
            rawConfidence = 1.0;
        }
        // CASE 2: Conflicting evidence found
        else if (conflictingCount > 0) {
            status = 'INCONCLUSIVE';
            taskSucceeded = false;
            const msg = 'Conflicting evidence observed across postconditions';
            failure = {
                category: 'CONFLICTING_EVIDENCE',
                message: msg,
                recoverable: false,
                fingerprint: computeVerificationFailureFingerprint(userId, sessionId, 'CONFLICTING_EVIDENCE', msg),
            };
            recommendation = 'MANUAL_INSPECTION';
            rawConfidence = 0.2;
        }
        // CASE 3: Postcondition failed
        else if (failedCount > 0 && requiredFailed) {
            status = 'FAILED';
            taskSucceeded = false;
            const firstFailed = postconditionResults.find(r => r.status === 'FAILED' && r.required);
            const msg = firstFailed?.message || 'One or more required postconditions failed';
            failure = {
                category: 'POSTCONDITION_FAILURE',
                message: msg,
                recoverable: !criticalFailed,
                details: {
                    postconditionId: firstFailed?.postconditionId,
                    targetPath: firstFailed?.targetPath,
                    operator: firstFailed?.operator,
                    expectedValue: firstFailed?.expectedValue,
                    observedValue: firstFailed?.observedValue,
                },
                fingerprint: computeVerificationFailureFingerprint(userId, sessionId, 'POSTCONDITION_FAILURE', msg),
            };
            recommendation = criticalFailed ? 'ABORT' : 'RETRY_RECOMMENDED';
            rawConfidence = 0.95;
        }
        // CASE 4: Missing evidence / UNKNOWN
        else if (unknownCount > 0 && requiredFailed) {
            status = 'UNKNOWN';
            taskSucceeded = false;
            const firstUnknown = postconditionResults.find(r => r.status === 'UNKNOWN' && r.required);
            const msg = firstUnknown?.message || 'Insufficient evidence to verify required postcondition';
            failure = {
                category: 'MISSING_EVIDENCE',
                message: msg,
                recoverable: true,
                details: {
                    postconditionId: firstUnknown?.postconditionId,
                    targetPath: firstUnknown?.targetPath,
                },
                fingerprint: computeVerificationFailureFingerprint(userId, sessionId, 'MISSING_EVIDENCE', msg),
            };
            recommendation = 'CLARIFICATION_REQUIRED';
            rawConfidence = 0.3;
        }
        // CASE 5: All required postconditions passed
        else if (summary.allRequiredPassed) {
            status = 'VERIFIED';
            taskSucceeded = true;
            recommendation = 'NONE';
            rawConfidence = postconditions.length > 0 ? (passedCount / postconditions.length) : 0.85;
            if (rawConfidence < 0.5)
                rawConfidence = 0.85;
        }
        // Default fallback
        else {
            status = 'UNKNOWN';
            taskSucceeded = false;
            recommendation = 'MANUAL_INSPECTION';
            rawConfidence = 0.4;
        }
        const confidence = validateConfidence(rawConfidence);
        // 7. Deterministic Fingerprint
        const postconditionsHash = postconditionResults.map(p => `${p.postconditionId}:${p.status}`).join('|');
        const fingerprint = computeVerificationFingerprint(userId, sessionId, toolName, status, postconditionsHash, normalized.risk, request.requestId);
        const verificationResult = createVerificationResult({
            verificationId: fingerprint,
            userId,
            sessionId,
            toolName,
            actionName,
            status,
            confidence,
            riskLevel: normalized.risk,
            executionSucceeded: normalized.executionSucceeded,
            taskSucceeded,
            postconditionResults,
            evidence: combinedEvidence,
            summary,
            failure,
            recommendation,
            fingerprint,
            verifiedAt: request.timestamp,
        });
        // 8. Record in audit history
        const partitionKey = this.getPartitionKey(userId, sessionId);
        const history = this.historyStore.get(partitionKey) || [];
        history.push(verificationResult);
        this.historyStore.set(partitionKey, history);
        return verificationResult;
    }
    /**
     * EN: Retrieves immutable verification history for a given user and session.
     * VI: Truy xuất lịch sử xác minh bất biến cho user và phiên cụ thể.
     */
    getHistory(userId, sessionId) {
        validateVerificationScope(userId, sessionId);
        const partitionKey = this.getPartitionKey(userId, sessionId);
        return Object.freeze([...(this.historyStore.get(partitionKey) || [])]);
    }
    /**
     * EN: Clears verification audit history for a specified session.
     * VI: Xóa lịch sử kiểm toán xác minh cho phiên được chỉ định.
     */
    clearSession(userId, sessionId) {
        validateVerificationScope(userId, sessionId);
        const partitionKey = this.getPartitionKey(userId, sessionId);
        this.historyStore.delete(partitionKey);
    }
}
