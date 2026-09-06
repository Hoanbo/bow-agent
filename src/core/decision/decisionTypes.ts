// src/core/decision/decisionTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.10: AGENT DECISION REASONING TYPES
//
// EN:
// Pure data models representing the Agent Decision Reasoning layer.
// This layer evaluates planner candidate actions, applies risk-aware filters,
// and proposes governed actions without executing tools, PDP, or mutating state.
//
// VI:
// Mô hình dữ liệu thuần túy đại diện cho tầng Suy luận Quyết định (Decision Reasoning).
// Tầng này đánh giá các candidate action từ planner, áp dụng bộ lọc nhận biết rủi ro,
// và đề xuất hành động có quản trị mà không thực thi tool, PDP hay thay đổi trạng thái.

import type { CandidateAction, SemanticIntent } from '../intent/intentTypes.js';
import type { ContextAwarePlan, DecisionContext, PlanRiskLevel, StructuredClarification } from '../planning/planningTypes.js';

/**
 * EN: Explicit lifecycle decision states supported by DecisionService.
 * VI: Các trạng thái quyết định vòng đời tường minh được DecisionService hỗ trợ.
 */
export type DecisionState = 'NO_ACTION' | 'RESPOND' | 'CLARIFY' | 'PROPOSE_ACTION' | 'DEFER' | 'BLOCK';

/**
 * EN: Scored and evaluated candidate action.
 * VI: Candidate action đã được chấm điểm và đánh giá.
 */
export interface DecisionCandidate {
  readonly action: CandidateAction;
  readonly score: number;
  readonly factors: readonly string[];
  readonly rejected?: string;
}

/**
 * EN: Structured uncertainty entry explaining why confidence was reduced or clarification needed.
 * VI: Mục bất định có cấu trúc giải thích lý do giảm độ tin cậy hoặc cần làm rõ.
 */
export interface DecisionUncertainty {
  readonly reason: string;
  readonly detail?: string;
}

/**
 * EN: Explainable, deterministic rationale for the chosen candidate.
 * VI: Cơ sở lý luận có thể giải thích, mang tính tất định cho candidate được chọn.
 */
export interface DecisionRationale {
  readonly primaryFactors: readonly string[];
  readonly rejectedCandidates: readonly {
    readonly action: string;
    readonly reason: string;
  }[];
}

/**
 * EN: Authoritative, immutable decision result produced by DecisionService.
 * VI: Kết quả quyết định có thẩm quyền, bất biến do DecisionService tạo ra.
 */
export interface DecisionResult {
  readonly success: boolean;
  readonly state: DecisionState;
  readonly userId: string;
  readonly sessionId: string;
  readonly intent: SemanticIntent;
  readonly selectedAction?: CandidateAction;
  readonly candidates: readonly DecisionCandidate[];
  readonly confidence: number;
  readonly uncertainty: readonly DecisionUncertainty[];
  readonly requiresClarification: boolean;
  readonly clarification?: StructuredClarification;
  readonly riskLevel: PlanRiskLevel;
  readonly governanceRequired: boolean;
  readonly approvalRequired: boolean;
  readonly rationale: DecisionRationale;
  readonly deterministicFingerprint: string;
}

/**
 * EN: Input payload supplied to DecisionService.decide().
 * VI: Payload đầu vào cung cấp cho DecisionService.decide().
 */
export interface DecisionInput {
  readonly context: DecisionContext;
  readonly plan: ContextAwarePlan;
}
