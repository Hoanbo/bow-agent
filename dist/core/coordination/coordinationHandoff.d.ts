import type { HandoffRequest, HandoffResult, ContinuityContext, ActiveSurface } from './coordinationTypes.js';
/**
 * EN: Validates a surface handoff request against active coordination state.
 * VI: Xác thực một yêu cầu bàn giao bề mặt đối chiếu với trạng thái điều phối tích cực.
 */
export declare function validateHandoff(request: HandoffRequest, activeSurfaces: readonly ActiveSurface[], currentContext: ContinuityContext): {
    valid: boolean;
    reason?: string;
};
/**
 * EN: Accepts a valid handoff request and produces updated ContinuityContext and HandoffResult.
 * VI: Chấp nhận yêu cầu bàn giao hợp lệ và tạo ContinuityContext cùng HandoffResult đã cập nhật.
 */
export declare function acceptHandoff(request: HandoffRequest, currentContext: ContinuityContext, updatedActiveSurfaces: readonly ActiveSurface[]): HandoffResult;
/**
 * EN: Rejects a handoff request and produces an immutable rejected HandoffResult.
 * VI: Từ chối yêu cầu bàn giao và tạo một HandoffResult bị từ chối bất biến.
 */
export declare function rejectHandoff(request: HandoffRequest, reason: string): HandoffResult;
