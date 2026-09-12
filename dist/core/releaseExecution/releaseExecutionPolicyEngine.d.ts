import { type ReleaseExecutionRequest, type ReleaseExecutionTarget } from './releaseExecutionTypes.js';
import type { ReleaseCandidate, ReleaseVerificationRecord } from '../release/releaseTypes.js';
export declare class ReleaseExecutionPolicyEngine {
    /**
     * Absolute canonical path for the protected workspace.
     * Đường dẫn tuyệt đối chuẩn tắc cho không gian làm việc được bảo vệ.
     */
    private static readonly PROTECTED_WORKSPACE_NORMALIZED;
    /**
     * Asserts that a target path does not touch or traverse into C:\BOW\shopofbow.
     * Khẳng định rằng đường dẫn mục tiêu không chạm vào hoặc đi vào C:\BOW\shopofbow.
     */
    static assertNotProtectedWorkspace(targetPath: string): void;
    /**
     * Asserts that a target path has no path traversal elements.
     * Khẳng định rằng đường dẫn mục tiêu không có phần tử duyệt đường dẫn nguy hiểm.
     */
    static assertSafePath(targetPath: string): void;
    /**
     * Asserts that USER_STOP is not active.
     * Khẳng định rằng USER_STOP không hoạt động.
     */
    static assertNotUserStopped(isUserStopActive?: boolean): void;
    /**
     * Asserts that capability lease or delegation is not revoked.
     * Khẳng định rằng hợp đồng thuê năng lực hoặc ủy quyền chưa bị thu hồi.
     */
    static assertNotRevoked(isRevoked?: boolean): void;
    /**
     * Validates a release candidate before execution scheduling.
     * Xác thực ứng viên phát hành trước khi lên lịch thực thi.
     */
    static validateCandidate(candidate: ReleaseCandidate): void;
    /**
     * Validates that the verification record is in PASS state.
     * Xác thực rằng bản ghi xác minh ở trạng thái PASS.
     */
    static validateVerificationRecord(record: ReleaseVerificationRecord, candidate: ReleaseCandidate): void;
    /**
     * Validates the execution request target against policy constraints.
     * Xác thực mục tiêu yêu cầu thực thi so với các ràng buộc chính sách.
     */
    static validateTarget(target: ReleaseExecutionTarget): void;
    /**
     * Comprehensive pre-execution policy gate check.
     * Kiểm tra cổng chính sách toàn diện trước khi thực thi.
     */
    static validateExecutionRequest(request: ReleaseExecutionRequest, candidate: ReleaseCandidate, verification: ReleaseVerificationRecord, options?: {
        isUserStopActive?: boolean;
        isRevoked?: boolean;
    }): void;
}
