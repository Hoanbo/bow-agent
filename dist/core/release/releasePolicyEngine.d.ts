import type { ReleaseCandidate } from './releaseTypes.js';
export declare class ReleasePolicyEngine {
    /**
     * Asserts that a target path does not target or traverse into the protected workspace C:\BOW\shopofbow.
     * Khẳng định rằng đường dẫn mục tiêu không nhắm tới hoặc duyệt vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
     */
    static assertNotProtectedWorkspace(targetPath: string): void;
    /**
     * Asserts that USER_STOP is not currently active.
     * Khẳng định rằng USER_STOP hiện không đang kích hoạt.
     */
    static assertNotUserStopped(isUserStopped: boolean, reason?: string): void;
    /**
     * Asserts that REVOCATION is not currently active.
     * Khẳng định rằng REVOCATION hiện không đang kích hoạt.
     */
    static assertNotRevoked(isRevoked: boolean): void;
    /**
     * Asserts that a release candidate has not expired.
     * Khẳng định rằng ứng viên phát hành chưa hết hạn.
     */
    static assertCandidateNotExpired(candidate: ReleaseCandidate): void;
    /**
     * Asserts that a release candidate is not in a terminal failure state.
     * Fail-closed: STALE, FAILED, REVOKED, BLOCKED, EXPIRED states all prohibit pipeline execution.
     * Khẳng định rằng ứng viên phát hành không ở trạng thái thất bại cuối cùng.
     * Thất bại đóng: STALE, FAILED, REVOKED, BLOCKED, EXPIRED đều cấm thực thi đường ống.
     */
    static assertCandidateExecutable(candidate: ReleaseCandidate): void;
}
