import { type DurableCommitRequest, type DurableCommitResult, type DurableCommitStatus } from './durableCommitTypes.js';
import { DurableCommitValidator } from './durableCommitValidator.js';
import { DurableCommitExecutionGate } from './durableCommitExecutionGate.js';
import { DurableCommitStore } from './durableCommitStore.js';
import { type AuditLedger } from '../auditLedger.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface DurableCommitRuntimeOptions {
    readonly validator?: DurableCommitValidator;
    readonly gate?: DurableCommitExecutionGate;
    readonly store?: DurableCommitStore;
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class DurableCommitRuntime {
    private readonly validator;
    private readonly gate;
    private readonly store;
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: DurableCommitRuntimeOptions);
    /**
     * EN: Recursively deep-freezes an object to guarantee absolute immutability.
     */
    private deepFreeze;
    /**
     * EN: Produces a canonical JSON string with deterministically sorted keys.
     */
    private canonicalJSON;
    /**
     * EN: Calculates SHA-256 cryptographic commit provenance hash.
     */
    calculateCommitProvenanceHash(params: {
        readonly verificationProvenanceHash: string;
        readonly taskId: string;
        readonly tenantId: string;
        readonly stepId: string;
        readonly executionId: string;
        readonly commitStatus: DurableCommitStatus;
        readonly committedState: Readonly<Record<string, unknown>>;
        readonly committedAt: string;
    }): string;
    /**
     * EN: Records structured audit event in globalAuditLedger.
     */
    private recordAudit;
    /**
     * EN: Primary execution entrypoint: commits verified reality into durable state.
     * Throws typed errors on gate aborts, binding violations, stale versions, duplicate commits,
     * security violations, and unverified inputs.
     */
    commitDurable(request: DurableCommitRequest): Promise<DurableCommitResult>;
    /**
     * EN: Safe execution wrapper: returns sealed DurableCommitResult without throwing.
     * Useful when callers require result inspection without exception handling.
     */
    tryCommitDurable(request: DurableCommitRequest): Promise<DurableCommitResult>;
}
export declare const globalDurableCommitRuntime: DurableCommitRuntime;
