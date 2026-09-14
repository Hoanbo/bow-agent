import { type AuditLedger } from '../auditLedger.js';
import { AgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import { type GroundedPlanTaskBinding, type GroundedPlanTaskLifecycleState } from './groundedPlanTaskTypes.js';
export interface GroundedPlanTaskLifecycleOptions {
    readonly taskRuntime?: AgentTaskRuntime;
    readonly auditLedger?: AuditLedger;
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanTaskLifecycleManager {
    private readonly taskRuntime;
    private readonly auditLedger;
    private readonly userStopProvider;
    constructor(options?: GroundedPlanTaskLifecycleOptions);
    /**
     * EN: Evaluates if a state transition is valid from the current state.
     * VI: Đánh giá xem một bước chuyển trạng thái có hợp lệ từ trạng thái hiện tại không.
     */
    isValidTransition(current: GroundedPlanTaskLifecycleState, next: GroundedPlanTaskLifecycleState): boolean;
    /**
     * EN: Transitions binding to next lifecycle state with OCC CAS validation.
     * VI: Chuyển đổi ràng buộc sang trạng thái tiếp theo với xác thực OCC CAS.
     */
    transitionState(binding: GroundedPlanTaskBinding, nextState: GroundedPlanTaskLifecycleState, expectedVersion: number, reason?: string): GroundedPlanTaskBinding;
}
