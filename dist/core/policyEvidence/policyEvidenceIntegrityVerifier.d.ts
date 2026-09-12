import { type IntegrityVerificationResult } from './policyEvidenceQueryTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';
import { PolicyCanaryProvenanceEngine } from '../policyCanary/policyCanaryProvenanceEngine.js';
import { PolicyEvidenceCollector } from '../policyObservability/policyEvidenceCollector.js';
import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface PolicyEvidenceIntegrityVerifierOptions {
    readonly provenanceEngine?: PolicyCanaryProvenanceEngine;
    readonly evidenceCollector?: PolicyEvidenceCollector;
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyEvidenceIntegrityVerifier {
    private readonly provenanceEngine;
    private readonly evidenceCollector;
    private readonly auditLedger;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyEvidenceIntegrityVerifierOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently verifies the end-to-end evidence and provenance integrity for a candidate.
     * Does NOT mutate state. Does NOT repair data. Strictly reports findings.
     *
     * Xác minh độc lập tính toàn vẹn của bằng chứng và nguồn gốc đầu-cuối cho một ứng viên.
     * KHÔNG làm đột biến trạng thái. KHÔNG sửa chữa dữ liệu. Hoàn toàn báo cáo các phát hiện.
     */
    verifyIntegrity(tenantPartition: string, candidateId: PolicyCandidateId): IntegrityVerificationResult;
}
export declare const globalPolicyEvidenceIntegrityVerifier: PolicyEvidenceIntegrityVerifier;
