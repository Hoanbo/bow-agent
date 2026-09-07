import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { LifecycleState } from '../lifecycle/lifecycleTypes.js';
import type { CrashConsistencyCondition, InterruptedOperationClassification, ApprovalRecoveryStatus } from './recoveryTypes.js';
/**
 * EN: Classifies an interrupted operation based on crash consistency evaluation and governance context.
 * VI: Phân loại một thao tác bị gián đoạn dựa trên đánh giá nhất quán sự cố và ngữ cảnh quản trị.
 */
export declare function classifyInterruptedOperation(crashCondition: CrashConsistencyCondition, activeLifecycleState?: LifecycleState, risk?: PlanRiskLevel, approvalStatus?: ApprovalRecoveryStatus, isPartialCommit?: boolean): InterruptedOperationClassification;
/**
 * EN: Evaluates approval recovery status from metadata without fabricating validity.
 * VI: Đánh giá trạng thái phục hồi phê duyệt từ metadata mà không tự ý tạo ra tính hợp lệ.
 */
export declare function evaluateApprovalRecoveryStatus(approvalMetadata?: Readonly<Record<string, unknown>>, lifecycleState?: LifecycleState): ApprovalRecoveryStatus;
