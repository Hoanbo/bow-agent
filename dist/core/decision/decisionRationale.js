// src/core/decision/decisionRationale.ts
// BOWCON V4.0 — MILESTONE 1.3.10: EXPLAINABLE DECISION RATIONALE
//
// EN:
// Generates explainable, deterministic rationales for chosen and rejected candidates.
// Guarantees zero secret exposure (INV-10) in decision reasoning traces.
//
// VI:
// Tạo cơ sở lý luận có thể giải thích, tất định cho các candidate được chọn và bị loại.
// Đảm bảo không lộ bất kỳ bí mật nào (INV-10) trong dấu vết suy luận quyết định.
const SECRET_SANITIZER = /(bearer\s+\S+|api[_-]?key\s*[:=]\s*\S+|authorization\s*[:=]\s*\S+|password\s*[:=]\s*\S+)/gi;
/**
 * EN: Sanitizes any text to prevent secret leakage in rationale logs or traces.
 * VI: Khử trùng văn bản để ngăn ngừa rò rỉ bí mật trong log hoặc dấu vết lý do.
 */
function sanitizeText(text) {
    if (typeof text !== 'string')
        return '';
    return text.replace(SECRET_SANITIZER, '[REDACTED_SECRET]');
}
/**
 * EN: Creates an explainable, deterministic rationale record.
 * VI: Tạo bản ghi cơ sở lý luận có thể giải thích, mang tính tất định.
 */
export function createRationale(selected, allCandidates = [], rejectionReasonOverride) {
    const primaryFactors = selected
        ? [...selected.factors]
        : ['insufficient_evidence_or_clarification_required'];
    const rejectedCandidates = [];
    for (const candidate of allCandidates) {
        if (candidate === selected)
            continue;
        const actionName = sanitizeText(candidate.action?.intentType || 'unknown_action');
        const reason = sanitizeText(rejectionReasonOverride ||
            candidate.rejected ||
            (selected && candidate.score < selected.score ? 'lower_confidence_score' : 'competing_or_tied_candidate'));
        rejectedCandidates.push(Object.freeze({
            action: actionName,
            reason,
        }));
    }
    return Object.freeze({
        primaryFactors: Object.freeze(primaryFactors.map(sanitizeText)),
        rejectedCandidates: Object.freeze(rejectedCandidates),
    });
}
