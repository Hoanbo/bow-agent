// src/core/toolAdapter/toolExecutionGate.ts
// BOWCON V4.0 — MS-1.4.06: TOOL EXECUTION GATE
//
// EN:
// Authoritative 4-checkpoint USER_STOP execution gate for the Tool Adapter Plane.
// Evaluates user stop status synchronously at every phase of execution:
//   Gate 1: Before request acceptance
//   Gate 2: Before adapter resolution
//   Gate 3: Immediately before adapter invocation
//   Gate 4: After adapter return / before result emission
// Fails closed immediately if USER_STOP is active.
//
// VI:
// Cổng thực thi USER_STOP 4 điểm kiểm tra có thẩm quyền cho Mặt phẳng Adapter Công cụ.
// Đánh giá trạng thái dừng của người dùng đồng bộ tại mỗi giai đoạn thực thi:
//   Cổng 1: Trước khi chấp nhận yêu cầu
//   Cổng 2: Trước khi phân giải adapter
//   Cổng 3: Ngay trước khi gọi adapter
//   Cổng 4: Sau khi adapter trả về / trước khi phát kết quả
// Thất bại đóng ngay lập tức nếu USER_STOP đang hoạt động.
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { ToolExecutionAbortedError } from './toolAdapterTypes.js';
export class ToolExecutionGate {
    isUserStopActiveFn;
    getUserStopReasonFn;
    constructor(options) {
        this.isUserStopActiveFn =
            options?.isUserStopActive ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this.getUserStopReasonFn =
            options?.getUserStopReason ?? (() => globalMasterHumanAuthority.userStopReason);
    }
    /**
     * Evaluates USER_STOP at a specific execution checkpoint.
     * Throws ToolExecutionAbortedError immediately if USER_STOP is active.
     */
    assertExecutionPermitted(checkpoint, context) {
        if (this.isUserStopActiveFn()) {
            const reason = this.getUserStopReasonFn() || 'Master Human Operator emergency stop';
            throw new ToolExecutionAbortedError(`USER_STOP_ACTIVE: Execution aborted at checkpoint "${checkpoint}". Reason: ${reason}`, {
                checkpoint,
                reason,
                ...context,
            });
        }
    }
    /**
     * Returns whether USER_STOP is currently active without throwing.
     */
    isUserStopActive() {
        return this.isUserStopActiveFn();
    }
    /**
     * Convenience checkpoint 1 assertion.
     */
    assertCanAcceptRequest(context) {
        this.assertExecutionPermitted('GATE_1_BEFORE_REQUEST_ACCEPTANCE', context);
    }
    /**
     * Convenience checkpoint 2 assertion.
     */
    assertCanResolveAdapter(context) {
        this.assertExecutionPermitted('GATE_2_BEFORE_ADAPTER_RESOLUTION', context);
    }
    /**
     * Convenience checkpoint 3 assertion.
     */
    assertCanInvokeAdapter(context) {
        this.assertExecutionPermitted('GATE_3_BEFORE_ADAPTER_INVOCATION', context);
    }
    /**
     * Convenience checkpoint 4 assertion.
     */
    assertCanEmitResult(context) {
        this.assertExecutionPermitted('GATE_4_BEFORE_RESULT_EMISSION', context);
    }
}
export const globalToolExecutionGate = new ToolExecutionGate();
