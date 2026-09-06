import type { DecisionState } from '../decision/decisionTypes.js';
import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Lifecycle status for action orchestration.
 * VI: Trạng thái vòng đời cho quá trình điều phối hành động.
 */
export type OrchestrationStatus = 'READY' | 'WAITING_APPROVAL' | 'BLOCKED' | 'CLARIFICATION_REQUIRED' | 'DEFERRED' | 'REJECTED' | 'EXECUTABLE' | 'NO_ACTION';
/**
 * EN: Immutable execution intent describing what action is to be governed.
 * VI: Ý định thực thi bất biến mô tả hành động nào cần được đưa vào quản trị.
 */
export interface ExecutionIntent {
    readonly userId: string;
    readonly sessionId: string;
    readonly actionId: string;
    readonly actionType: string;
    readonly targetDomain: string;
    readonly parameters: Readonly<Record<string, unknown>>;
    readonly risk: PlanRiskLevel;
    readonly confidence: number;
    readonly governanceRequired: boolean;
    readonly approvalRequired: boolean;
    readonly sourceDecisionFingerprint: string;
    readonly createdAt: string;
}
/**
 * EN: Governed execution request prepared for Policy Decision Point (PDP) and ToolRegistry.
 * VI: Yêu cầu thực thi có quản trị chuẩn bị cho Policy Decision Point (PDP) và ToolRegistry.
 */
export interface ExecutionRequest {
    readonly requestId: string;
    readonly intent: ExecutionIntent;
    readonly executionFingerprint: string;
    readonly status: OrchestrationStatus;
    readonly toolName?: string;
    readonly args?: Readonly<Record<string, unknown>>;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * EN: Authoritative, immutable result returned by ActionOrchestrator.
 * VI: Kết quả có thẩm quyền, bất biến do ActionOrchestrator trả về.
 */
export interface OrchestrationResult {
    readonly success: boolean;
    readonly status: OrchestrationStatus;
    readonly executionIntent?: ExecutionIntent;
    readonly executionRequest?: ExecutionRequest;
    readonly governanceRequired: boolean;
    readonly approvalRequired: boolean;
    readonly riskLevel: PlanRiskLevel;
    readonly decisionState: DecisionState;
    readonly fingerprint: string;
    readonly errors: readonly string[];
    readonly requiresClarification: boolean;
    readonly clarificationQuestion?: string;
    readonly reasons: readonly string[];
}
