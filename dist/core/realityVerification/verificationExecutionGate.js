// src/core/realityVerification/verificationExecutionGate.ts
// BOWCON V4.0 — MS-1.4.07: VERIFICATION EXECUTION GATE
//
// EN:
// Authoritative 4-checkpoint USER_STOP execution gate for the Reality Verification Engine.
// Evaluates user stop status synchronously at every phase of verification:
//   Gate 1: Before request acceptance
//   Gate 2: Before evidence collection
//   Gate 3: Before oracle evaluation
//   Gate 4: Before emitting final RealityVerificationResult
// Fails closed immediately if USER_STOP is active.
//
// VI:
// Cổng thực thi USER_STOP 4 điểm kiểm tra có thẩm quyền cho Động cơ Xác minh Thực tế.
// Đánh giá trạng thái dừng của người dùng đồng bộ tại mỗi giai đoạn xác minh:
//   Cổng 1: Trước khi chấp nhận yêu cầu
//   Cổng 2: Trước khi thu thập bằng chứng
//   Cổng 3: Trước khi oracle đánh giá
//   Cổng 4: Trước khi phát kết quả RealityVerificationResult cuối cùng
// Thất bại đóng ngay lập tức nếu USER_STOP đang hoạt động.
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { VerificationAbortedError } from './realityVerificationTypes.js';
export class VerificationExecutionGate {
    isUserStopActiveFn;
    getUserStopReasonFn;
    constructor(options) {
        this.isUserStopActiveFn =
            options?.isUserStopActive ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this.getUserStopReasonFn =
            options?.getUserStopReason ?? (() => globalMasterHumanAuthority.userStopReason);
    }
    /**
     * Evaluates USER_STOP at a specific verification checkpoint.
     * Throws VerificationAbortedError immediately if USER_STOP is active.
     */
    assertVerificationPermitted(checkpoint, context) {
        if (this.isUserStopActiveFn()) {
            const reason = this.getUserStopReasonFn() || 'Master Human Operator emergency stop';
            throw new VerificationAbortedError(`USER_STOP_ACTIVE: Verification aborted at checkpoint "${checkpoint}". Reason: ${reason}`, {
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
        this.assertVerificationPermitted('GATE_1_BEFORE_REQUEST_ACCEPTANCE', context);
    }
    /**
     * Convenience checkpoint 2 assertion.
     */
    assertCanCollectEvidence(context) {
        this.assertVerificationPermitted('GATE_2_BEFORE_EVIDENCE_COLLECTION', context);
    }
    /**
     * Convenience checkpoint 3 assertion.
     */
    assertCanEvaluateOracle(context) {
        this.assertVerificationPermitted('GATE_3_BEFORE_ORACLE_EVALUATION', context);
    }
    /**
     * Convenience checkpoint 4 assertion.
     */
    assertCanEmitResult(context) {
        this.assertVerificationPermitted('GATE_4_BEFORE_RESULT_EMISSION', context);
    }
}
export const globalVerificationExecutionGate = new VerificationExecutionGate();
