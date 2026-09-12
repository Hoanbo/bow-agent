import { type QualityEvidenceBundle } from './qualityTypes.js';
import type { SandboxDescriptor, SandboxManifest } from '../sandbox/sandboxTypes.js';
export interface QualityVerificationResult {
    readonly verified: boolean;
    readonly reason?: string;
    readonly verifiedAt: number;
}
export declare class QualityVerificationEngine {
    /**
     * Verifies the cryptographic integrity and freshness of an evidence bundle against live sandbox state.
     * Xác minh tính toàn vẹn mật mã và độ tươi mới của một gói bằng chứng đối chiếu với trạng thái sandbox thực tế.
     */
    verifyEvidenceBundle(bundle: QualityEvidenceBundle, sandbox: SandboxDescriptor, currentManifest: SandboxManifest): QualityVerificationResult;
}
