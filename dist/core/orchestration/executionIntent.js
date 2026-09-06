// src/core/orchestration/executionIntent.ts
// BOWCON V4.0 — MILESTONE 1.3.11: IMMUTABLE EXECUTION INTENT BUILDER
//
// EN:
// Constructs frozen, immutable ExecutionIntent models from decision candidates.
// Maps intent types to domains and applies strict governance policy attributes.
//
// VI:
// Xây dựng mô hình ExecutionIntent đóng băng, bất biến từ các decision candidate.
// Ánh xạ các loại intent sang domain và áp dụng các thuộc tính chính sách quản trị nghiêm ngặt.
import { getPolicyRulesForRisk } from './executionPolicy.js';
/**
 * EN: Maps candidate action types to business capability domains.
 * VI: Ánh xạ loại candidate action sang domain năng lực nghiệp vụ.
 */
export function resolveTargetDomain(actionType) {
    if (actionType.startsWith('ORDER_') || actionType.startsWith('CANCEL_') || actionType.startsWith('REFUND_')) {
        return 'orders';
    }
    if (actionType.startsWith('PRODUCT_') || actionType.startsWith('CATALOG_')) {
        return 'catalog';
    }
    if (actionType.startsWith('VOICE_')) {
        return 'voice';
    }
    if (actionType.startsWith('DELETE_')) {
        return 'storage';
    }
    if (actionType.startsWith('STATUS_') || actionType.startsWith('PAYMENT_')) {
        return 'payments';
    }
    return 'general';
}
/**
 * EN: Builds an immutable, defensive copy of ExecutionIntent.
 * VI: Xây dựng bản sao phòng thủ, bất biến của ExecutionIntent.
 */
export function createExecutionIntent(decision, candidate, customRisk) {
    const effectiveRisk = customRisk || decision.riskLevel || 'LOW';
    const policy = getPolicyRulesForRisk(effectiveRisk);
    const parametersCopy = Object.freeze({ ...(candidate.parameters || {}) });
    // Generate deterministic action ID from decision fingerprint and intent type
    const actionId = `act_${decision.deterministicFingerprint.replace(/^dec_/, '')}_${candidate.intentType.toLowerCase()}`;
    return Object.freeze({
        userId: decision.userId,
        sessionId: decision.sessionId,
        actionId,
        actionType: candidate.intentType,
        targetDomain: resolveTargetDomain(candidate.intentType),
        parameters: parametersCopy,
        risk: effectiveRisk,
        confidence: decision.confidence,
        governanceRequired: policy.governanceRequired,
        approvalRequired: policy.approvalRequired,
        sourceDecisionFingerprint: decision.deterministicFingerprint,
        createdAt: '2026-09-06T00:00:00.000Z', // Deterministic baseline timestamp
    });
}
