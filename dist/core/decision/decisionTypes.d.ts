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
