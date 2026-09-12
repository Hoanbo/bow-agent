// src/core/release/releasePolicyEngine.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// Policy engine enforcing USER_STOP supremacy, REVOCATION supremacy, protected workspace isolation,
// and candidate lifecycle guards for the Release Verification subsystem.
// Động cơ chính sách thực thi quyền tối cao USER_STOP, REVOCATION, cô lập không gian làm việc bảo vệ,
// và bảo vệ vòng đời ứng viên cho phân hệ Xác minh Phát hành.
//
// STRICT INVARIANTS:
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - CANDIDATE_STALE/FAILED/REVOKED/EXPIRED => FAIL CLOSED (no release authorization)
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import path from 'node:path';
import { ReleaseError, ReleaseErrorCode } from './releaseTypes.js';
export class ReleasePolicyEngine {
    /**
     * Asserts that a target path does not target or traverse into the protected workspace C:\BOW\shopofbow.
     * Khẳng định rằng đường dẫn mục tiêu không nhắm tới hoặc duyệt vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
     */
    static assertNotProtectedWorkspace(targetPath) {
        const normalized = path.normalize(targetPath).toLowerCase();
        if (normalized === 'c:\\bow\\shopofbow' ||
            normalized.startsWith('c:\\bow\\shopofbow\\')) {
            throw new ReleaseError(ReleaseErrorCode.PROTECTED_WORKSPACE_VIOLATION, `Release operation targets protected workspace C:\\BOW\\shopofbow. Execution denied. ` +
                `Thao tác phát hành nhắm vào không gian làm việc được bảo vệ C:\\BOW\\shopofbow. Từ chối thực thi.`);
        }
    }
    /**
     * Asserts that USER_STOP is not currently active.
     * Khẳng định rằng USER_STOP hiện không đang kích hoạt.
     */
    static assertNotUserStopped(isUserStopped, reason) {
        if (isUserStopped) {
            throw new ReleaseError(ReleaseErrorCode.USER_STOP_ACTIVE, `Release pipeline rejected: USER_STOP is currently active${reason ? ` (${reason})` : ''}. ` +
                `Đường ống phát hành bị từ chối: USER_STOP đang kích hoạt.`);
        }
    }
    /**
     * Asserts that REVOCATION is not currently active.
     * Khẳng định rằng REVOCATION hiện không đang kích hoạt.
     */
    static assertNotRevoked(isRevoked) {
        if (isRevoked) {
            throw new ReleaseError(ReleaseErrorCode.REVOCATION_ACTIVE, `Release pipeline rejected: Execution context has been revoked. ` +
                `Đường ống phát hành bị từ chối: Ngữ cảnh thực thi đã bị thu hồi.`);
        }
    }
    /**
     * Asserts that a release candidate has not expired.
     * Khẳng định rằng ứng viên phát hành chưa hết hạn.
     */
    static assertCandidateNotExpired(candidate) {
        if (Date.now() > candidate.expiresAt) {
            throw new ReleaseError(ReleaseErrorCode.CANDIDATE_EXPIRED, `Release candidate "${candidate.candidateId}" has expired at ${new Date(candidate.expiresAt).toISOString()}. ` +
                `Ứng viên phát hành đã hết hạn.`);
        }
    }
    /**
     * Asserts that a release candidate is not in a terminal failure state.
     * Fail-closed: STALE, FAILED, REVOKED, BLOCKED, EXPIRED states all prohibit pipeline execution.
     * Khẳng định rằng ứng viên phát hành không ở trạng thái thất bại cuối cùng.
     * Thất bại đóng: STALE, FAILED, REVOKED, BLOCKED, EXPIRED đều cấm thực thi đường ống.
     */
    static assertCandidateExecutable(candidate) {
        switch (candidate.state) {
            case 'STALE':
                throw new ReleaseError(ReleaseErrorCode.CANDIDATE_STALE, `Release candidate "${candidate.candidateId}" is STALE and cannot be re-verified. ` +
                    `Ứng viên phát hành đang STALE và không thể được xác minh lại.`);
            case 'FAILED':
                throw new ReleaseError(ReleaseErrorCode.CANDIDATE_FAILED, `Release candidate "${candidate.candidateId}" is in FAILED state. ` +
                    `Ứng viên phát hành đang ở trạng thái FAILED.`);
            case 'REVOKED':
                throw new ReleaseError(ReleaseErrorCode.CANDIDATE_REVOKED, `Release candidate "${candidate.candidateId}" has been REVOKED. ` +
                    `Ứng viên phát hành đã bị REVOKED.`);
            case 'BLOCKED':
                throw new ReleaseError(ReleaseErrorCode.CANDIDATE_REVOKED, `Release candidate "${candidate.candidateId}" is BLOCKED. ` +
                    `Ứng viên phát hành đang BLOCKED.`);
            case 'EXPIRED':
                throw new ReleaseError(ReleaseErrorCode.CANDIDATE_EXPIRED, `Release candidate "${candidate.candidateId}" has EXPIRED. ` +
                    `Ứng viên phát hành đã EXPIRED.`);
            case 'REJECTED':
                throw new ReleaseError(ReleaseErrorCode.ACCEPTANCE_CRITERIA_FAILED, `Release candidate "${candidate.candidateId}" was REJECTED. ` +
                    `Ứng viên phát hành đã bị REJECTED.`);
            // PROPOSED and VERIFYING are executable; VERIFIED is terminal-success.
            // PROPOSED và VERIFYING là có thể thực thi; VERIFIED là thành công cuối cùng.
            case 'PROPOSED':
            case 'VERIFYING':
            case 'VERIFIED':
                return;
            default:
                // Fail closed on unknown states.
                // Thất bại đóng với các trạng thái không xác định.
                throw new ReleaseError(ReleaseErrorCode.CANDIDATE_FAILED, `Release candidate "${candidate.candidateId}" is in an unrecognized state. Rejecting.`);
        }
    }
}
