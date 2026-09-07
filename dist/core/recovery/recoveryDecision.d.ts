import type { InterruptedOperationClassification, RecoveryDecision, ApprovalRecoveryStatus } from './recoveryTypes.js';
import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Determines the authoritative safe recovery decision.
 * VI: Xác định quyết định phục hồi an toàn có thẩm quyền.
 */
export declare function determineRecoveryDecision(classification: InterruptedOperationClassification, approvalStatus?: ApprovalRecoveryStatus, risk?: PlanRiskLevel): RecoveryDecision;
