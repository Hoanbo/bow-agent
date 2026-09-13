import { type DurableCommitRequest, type DurableCommitContext } from './durableCommitTypes.js';
import type { RealityVerificationResult } from '../realityVerification/realityVerificationTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface DurableCommitValidatorOptions {
    readonly maxPayloadBytes?: number;
    readonly maxDepth?: number;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class DurableCommitValidator {
    private readonly maxPayloadBytes;
    private readonly maxDepth;
    private readonly sanitizer;
    constructor(options?: DurableCommitValidatorOptions);
    /**
     * EN: Defensively validates raw incoming payload for security threats.
     * Rejects prototype pollution (__proto__, constructor, prototype), null bytes,
     * excessive nesting (>10), and payloads exceeding size limits (64 KB).
     */
    defensivelyValidatePayload(payload: unknown, depth?: number): void;
    /**
     * EN: Validates the structural envelope of a DurableCommitRequest.
     */
    validateRequestEnvelope(request: unknown): asserts request is DurableCommitRequest;
    /**
     * EN: Enforces VERIFIED-only commit authority on RealityVerificationResult.
     * Invariant: A tool execution result never grants commit authority.
     * Only VERIFIED with summary.allRequiredPassed === true may proceed.
     */
    validateVerificationAuthority(verification: RealityVerificationResult): void;
    /**
     * EN: Validates task, tenant, step, execution, and version concurrency bindings.
     */
    validateBindings(verification: RealityVerificationResult, authoritativeTask: AgentTask, context?: DurableCommitContext, expectedTaskVersion?: number): void;
    /**
     * EN: Validates identifier strings against path traversal or reserved keywords.
     */
    validateIdentifierSafety(identifier: string, fieldName: string): void;
    /**
     * EN: Sanitizes data structures using DiagnosisSanitizer for safe logging and persistence.
     */
    sanitize<T>(data: T): T;
}
export declare const globalDurableCommitValidator: DurableCommitValidator;
