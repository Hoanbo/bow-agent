import { type ReleaseCandidate, type ReleaseVerificationRecord, type ReleaseVerificationState, type ReleaseVerificationContext } from './releaseTypes.js';
import type { QualityRuntime } from '../quality/qualityRuntime.js';
import type { SandboxDescriptor, SandboxManifest } from '../sandbox/sandboxTypes.js';
import { AuditLedger } from '../auditLedger.js';
export interface RunPipelineOptions {
    readonly isUserStopped?: boolean;
    readonly userStopReason?: string;
    readonly isRevoked?: boolean;
    /** Additional release candidates to check for cross-agent contradictions. */
    readonly siblingCandidates?: readonly ReleaseCandidate[];
    /** Additional verification records to check for cross-agent contradictions. */
    readonly siblingVerifications?: readonly ReleaseVerificationRecord[];
}
export declare class ReleaseVerificationPipeline {
    private readonly qualityRuntime;
    private readonly auditLedger;
    private readonly criteriaEngine;
    private readonly contradictionEngine;
    constructor(qualityRuntime: QualityRuntime, auditLedger?: AuditLedger);
    /**
     * Computes the deterministic SHA-256 hash for a ReleaseVerificationRecord.
     * Covers: verificationId + candidateId + provenanceHash + criteria evaluation hash + verificationState.
     *
     * Tính toán mã băm SHA-256 tất định cho ReleaseVerificationRecord.
     * Bao gồm: verificationId + candidateId + provenanceHash + mã băm đánh giá tiêu chí + verificationState.
     */
    static hashVerificationRecord(verificationId: string, candidateId: string, provenanceHash: string, evaluationHash: string, verificationState: ReleaseVerificationState): string;
    /**
     * Records an audit event to the AuditLedger.
     * Ghi lại một sự kiện kiểm toán vào AuditLedger.
     */
    private logAudit;
    /**
     * Assembles a terminal FAIL ReleaseVerificationRecord from pipeline failure.
     * Used by each stage to produce a deterministic, fail-closed output.
     *
     * Lắp ráp một ReleaseVerificationRecord FAIL cuối cùng từ thất bại đường ống.
     * Được dùng bởi mỗi giai đoạn để tạo ra đầu ra thất bại đóng, tất định.
     */
    private buildFailRecord;
    /**
     * Executes the full 10-stage Release Verification Pipeline.
     *
     * INVARIANT REMINDER:
     * A PASS result from this pipeline is a TECHNICAL FINDING ONLY.
     * It is NOT release authorization. It is NOT owner approval.
     * The Master Owner must independently authorize any actual release.
     *
     * Thực thi toàn bộ Đường ống Xác minh Phát hành 10 giai đoạn.
     *
     * NHẮC NHỞ BẤT BIẾN:
     * Kết quả PASS từ đường ống này chỉ là KẾT QUẢ KỸ THUẬT.
     * KHÔNG phải ủy quyền phát hành. KHÔNG phải phê duyệt của Owner.
     * Master Owner phải độc lập ủy quyền cho bất kỳ hành động phát hành thực tế nào.
     */
    run(candidate: ReleaseCandidate, context: ReleaseVerificationContext, sandbox: SandboxDescriptor, currentManifest: SandboxManifest, options?: RunPipelineOptions): Promise<ReleaseVerificationRecord>;
}
