import type { DecisionCandidate, DecisionRationale } from './decisionTypes.js';
/**
 * EN: Creates an explainable, deterministic rationale record.
 * VI: Tạo bản ghi cơ sở lý luận có thể giải thích, mang tính tất định.
 */
export declare function createRationale(selected?: DecisionCandidate, allCandidates?: readonly DecisionCandidate[], rejectionReasonOverride?: string): DecisionRationale;
