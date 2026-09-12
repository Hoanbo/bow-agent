import { type ReleaseCandidate, type ReleaseVerificationRecord, type ReleaseCandidateId, type ReleaseVerificationId, type ReleaseVerificationContext } from './releaseTypes.js';
import { ReleaseCandidateEngine, type CreateReleaseCandidateParams } from './releaseCandidateEngine.js';
import { ReleaseVerificationPipeline, type RunPipelineOptions } from './releaseVerificationPipeline.js';
import type { QualityRuntime } from '../quality/qualityRuntime.js';
import type { SandboxDescriptor, SandboxManifest } from '../sandbox/sandboxTypes.js';
import { AuditLedger } from '../auditLedger.js';
export declare class ReleaseRuntime {
    private readonly qualityRuntime;
    private readonly auditLedger;
    readonly candidateEngine: ReleaseCandidateEngine;
    readonly pipeline: ReleaseVerificationPipeline;
    private readonly candidates;
    private readonly verificationRecords;
    private _isUserStopped;
    private _userStopReason;
    constructor(qualityRuntime?: QualityRuntime, auditLedger?: AuditLedger);
    /**
     * Requests emergency USER_STOP, halting all release pipeline operations immediately.
     * Yêu cầu dừng khẩn cấp USER_STOP, lập tức dừng mọi thao tác đường ống phát hành.
     */
    requestUserStop(reason: string): void;
    /**
     * Authoritatively resets USER_STOP under Master Owner authority.
     * Thiết lập lại USER_STOP một cách có thẩm quyền dưới quyền Master Owner.
     */
    resetUserStop(): void;
    /**
     * Checks whether emergency USER_STOP is currently active.
     * Kiểm tra xem lệnh dừng khẩn cấp USER_STOP có đang kích hoạt hay không.
     */
    isUserStopped(): boolean;
    /**
     * Proposes a new release candidate. Validates all required bindings,
     * computes the deterministic provenance hash, and stores the candidate.
     *
     * INVARIANT: A proposed candidate is NOT a release authorization.
     * Đề xuất một ứng viên phát hành mới. Xác thực tất cả các liên kết bắt buộc,
     * tính toán mã băm nguồn gốc tất định và lưu trữ ứng viên.
     *
     * BẤT BIẾN: Ứng viên được đề xuất KHÔNG phải là ủy quyền phát hành.
     */
    proposeReleaseCandidate(params: CreateReleaseCandidateParams, options?: {
        readonly projectRoot?: string;
    }): ReleaseCandidate;
    /**
     * Runs the full 10-stage Release Verification Pipeline for a given candidate.
     *
     * INVARIANT REMINDER: A PASS result is a TECHNICAL FINDING ONLY.
     * It is NOT release authorization. It is NOT owner approval.
     *
     * Chạy toàn bộ Đường ống Xác minh Phát hành 10 giai đoạn cho một ứng viên nhất định.
     *
     * NHẮC NHỞ BẤT BIẾN: Kết quả PASS chỉ là KẾT QUẢ KỸ THUẬT.
     * KHÔNG phải ủy quyền phát hành. KHÔNG phải phê duyệt của Owner.
     */
    runReleaseVerification(candidateId: ReleaseCandidateId, context: Omit<ReleaseVerificationContext, 'candidateId'>, sandbox: SandboxDescriptor, currentManifest: SandboxManifest, options?: RunPipelineOptions): Promise<ReleaseVerificationRecord>;
    /**
     * Retrieves a stored release candidate by ID.
     * Lấy ứng viên phát hành đã lưu theo ID.
     */
    getReleaseCandidate(candidateId: ReleaseCandidateId): ReleaseCandidate | undefined;
    /**
     * Retrieves a stored release verification record by ID.
     * Lấy bản ghi xác minh phát hành đã lưu theo ID.
     */
    getVerificationRecord(verificationId: ReleaseVerificationId): ReleaseVerificationRecord | undefined;
    /**
     * Returns all stored release candidates.
     * Trả về tất cả các ứng viên phát hành đã lưu.
     */
    getAllCandidates(): readonly ReleaseCandidate[];
    /**
     * Returns all stored verification records.
     * Trả về tất cả các bản ghi xác minh đã lưu.
     */
    getAllVerificationRecords(): readonly ReleaseVerificationRecord[];
    /**
     * Clears all in-memory runtime state.
     * Xóa sạch toàn bộ trạng thái runtime trong bộ nhớ.
     */
    clear(): void;
    /**
     * Records an audit event to the canonical AuditLedger.
     * Ghi lại một sự kiện kiểm toán vào AuditLedger chuẩn tắc.
     */
    private logAudit;
}
/**
 * Global singleton ReleaseRuntime instance.
 * Thể hiện singleton toàn cục của ReleaseRuntime.
 */
export declare const globalReleaseRuntime: ReleaseRuntime;
