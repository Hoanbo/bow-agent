import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { type GroundedPlanTaskBinding, type HumanConfirmationRequest, type HumanConfirmationRecord } from './groundedPlanTaskTypes.js';
export interface GroundedPlanHumanGateOptions {
    readonly masterAuthority?: MasterHumanAuthority;
    readonly userStopProvider?: () => boolean;
    readonly tokenTtlMs?: number;
}
export declare class GroundedPlanHumanGate {
    private readonly masterAuthority;
    private readonly userStopProvider;
    private readonly tokenTtlMs;
    private readonly consumedTokens;
    constructor(options?: GroundedPlanHumanGateOptions);
    /**
     * EN: Evaluates whether the plan task binding requires authoritative human confirmation.
     * VI: Đánh giá xem ràng buộc nhiệm vụ kế hoạch có bắt buộc xác nhận từ con người hay không.
     */
    requiresConfirmation(binding: GroundedPlanTaskBinding): boolean;
    /**
     * EN: Creates a formal human confirmation request review envelope.
     * VI: Tạo phong bì xem xét yêu cầu xác nhận chính thức từ con người.
     */
    createConfirmationRequest(binding: GroundedPlanTaskBinding): HumanConfirmationRequest;
    /**
     * EN: Issues an authoritative human confirmation token signed by MasterHumanAuthority.
     * VI: Cấp mã xác nhận con người có thẩm quyền được ký bởi MasterHumanAuthority.
     */
    issueConfirmationToken(request: HumanConfirmationRequest, operatorId: string): HumanConfirmationRecord;
    /**
     * EN: Validates and consumes an authoritative HumanConfirmationRecord against a binding.
     * VI: Xác thực và tiêu thụ một HumanConfirmationRecord có thẩm quyền đối với một ràng buộc.
     */
    validateAndConsumeConfirmation(confirmation: HumanConfirmationRecord, binding: GroundedPlanTaskBinding): void;
    /**
     * EN: Clears consumed tokens cache (e.g. on session termination or testing).
     * VI: Xóa bộ đệm token đã tiêu thụ (ví dụ khi kết thúc phiên hoặc thử nghiệm).
     */
    resetConsumedTokens(): void;
}
