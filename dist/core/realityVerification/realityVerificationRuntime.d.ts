import type { AgentTaskStore } from '../taskLifecycle/agentTaskStore.js';
import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type RealityVerificationRequest, type RealityVerificationResult, type RealityVerificationStatus } from './realityVerificationTypes.js';
import { RealityEvidenceCollector } from './realityEvidenceCollector.js';
import { PostconditionVerificationOracle } from './postconditionVerificationOracle.js';
import { VerificationExecutionGate } from './verificationExecutionGate.js';
export interface RealityVerificationRuntimeOptions {
    readonly evidenceCollector?: RealityEvidenceCollector;
    readonly collector?: RealityEvidenceCollector;
    readonly oracle?: PostconditionVerificationOracle;
    readonly executionGate?: VerificationExecutionGate;
    readonly gate?: VerificationExecutionGate;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly auditLedger?: AuditLedger;
    readonly taskStore?: AgentTaskStore;
    readonly deterministicTimestamp?: string;
}
export declare class RealityVerificationRuntime {
    private readonly evidenceCollector;
    private readonly oracle;
    private readonly executionGate;
    private readonly sanitizer;
    private readonly auditLedger;
    private readonly taskStore?;
    private readonly deterministicTimestamp?;
    constructor(options?: RealityVerificationRuntimeOptions);
    /**
     * Primary entrypoint: verifies an executed tool result against intended reality invariants.
     */
    verifyReality(request: RealityVerificationRequest, currentTime?: string): Promise<RealityVerificationResult>;
    /**
     * Factory constructing an immutable RealityVerificationResult with cryptographic provenance.
     */
    private createVerificationResult;
    /**
     * Computes deterministic SHA-256 cryptographic provenance hash for verification.
     */
    calculateVerificationProvenanceHash(params: {
        executionProvenanceHash: string;
        taskId: string;
        stepId: string;
        status: RealityVerificationStatus;
        summary: unknown;
        verifiedAt: string;
    }): string;
    /**
     * Appends structured audit record to globalAuditLedger.
     */
    private recordAudit;
}
export declare const globalRealityVerificationRuntime: RealityVerificationRuntime;
