// src/core/decision/actionSelector.ts
// BOWCON V4.0 — MILESTONE 1.3.10: CANDIDATE ACTION SELECTOR
//
// EN:
// Selects the highest-confidence candidate action without executing it.
// Eliminates invalid candidates, detects ties without arbitrary guessing,
// and requests clarification when ambiguity exists.
//
// VI:
// Chọn candidate action có độ tin cậy cao nhất nhưng không thực thi.
// Loại bỏ các candidate không hợp lệ, phát hiện thế hòa điểm (tie) mà không đoán tùy tiện,
// và yêu cầu làm rõ khi có sự mơ hồ.
import { scoreCandidate } from './decisionScorer.js';
import { DECISION_THRESHOLDS } from './decisionConfidence.js';
/**
 * EN: Known valid agent intent types representing supported capabilities (INV-6).
 * VI: Các loại intent hợp lệ đã biết đại diện cho năng lực được hỗ trợ (INV-6).
 */
const KNOWN_INTENT_TYPES = new Set([
    'CANCEL_REQUEST',
    'DELETE_REQUEST',
    'ORDER_QUERY',
    'PAYMENT_REQUEST',
    'PRODUCT_QUERY',
    'REFUND_REQUEST',
    'SHIPPING_QUERY',
    'STATUS_REQUEST',
    'VOICE_COMMAND',
    'GENERAL_CONVERSATION',
    'UNKNOWN',
]);
/**
 * EN: Validates a single candidate action against capability and structural constraints.
 * VI: Xác thực một candidate action theo các ràng buộc cấu trúc và năng lực.
 */
function validateCandidate(action) {
    if (!action || typeof action !== 'object') {
        return { valid: false, reason: 'malformed_candidate' };
    }
    const candidate = action;
    if (typeof candidate.intentType !== 'string' || candidate.intentType.length === 0) {
        return { valid: false, reason: 'missing_intent_type' };
    }
    if (!KNOWN_INTENT_TYPES.has(candidate.intentType)) {
        return { valid: false, reason: 'unknown_capability' };
    }
    return { valid: true };
}
/**
 * EN: Evaluates, validates, and selects the optimal candidate action deterministically.
 * VI: Đánh giá, xác thực và lựa chọn candidate action tối ưu một cách tất định.
 */
export function selectAction(candidates, intent, context) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
        return Object.freeze({
            candidates: Object.freeze([]),
            rejectedCandidates: Object.freeze([]),
            tied: false,
            tieCandidates: Object.freeze([]),
        });
    }
    const validActions = [];
    const rejectedList = [];
    // 1. Candidate Validation & Elimination (INV-6)
    for (const action of candidates) {
        const check = validateCandidate(action);
        if (!check.valid) {
            rejectedList.push(Object.freeze({
                action: action,
                score: 0,
                factors: Object.freeze([]),
                rejected: check.reason,
            }));
        }
        else {
            validActions.push(action);
        }
    }
    // 2. Deterministic Scoring of Valid Candidates
    const scoredCandidates = validActions.map(action => scoreCandidate(action, intent, context));
    // Sort descending by score; if tied, sort deterministically by intentType string
    scoredCandidates.sort((a, b) => {
        const diff = b.score - a.score;
        if (Math.abs(diff) > 0.0001)
            return diff;
        return a.action.intentType.localeCompare(b.action.intentType);
    });
    const allEvaluated = Object.freeze([...scoredCandidates, ...rejectedList]);
    if (scoredCandidates.length === 0) {
        return Object.freeze({
            candidates: allEvaluated,
            rejectedCandidates: Object.freeze(rejectedList),
            tied: false,
            tieCandidates: Object.freeze([]),
        });
    }
    // 3. Tie Detection (INV-5, Section 7)
    // If top two candidates have a score difference <= tieDelta, do not arbitrarily choose.
    const isTied = scoredCandidates.length > 1 &&
        Math.abs(scoredCandidates[0].score - scoredCandidates[1].score) <= DECISION_THRESHOLDS.tieDelta;
    if (isTied) {
        const tieCandidates = Object.freeze([scoredCandidates[0], scoredCandidates[1]]);
        return Object.freeze({
            selected: undefined,
            candidates: allEvaluated,
            rejectedCandidates: Object.freeze(rejectedList),
            tied: true,
            tieCandidates,
        });
    }
    return Object.freeze({
        selected: scoredCandidates[0],
        candidates: allEvaluated,
        rejectedCandidates: Object.freeze(rejectedList),
        tied: false,
        tieCandidates: Object.freeze([]),
    });
}
