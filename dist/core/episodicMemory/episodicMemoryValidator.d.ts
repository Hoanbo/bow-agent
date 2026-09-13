import { type EpisodicMemoryRequest, type EpisodicMemoryContext } from './episodicMemoryTypes.js';
import type { DurableCommitRecord } from '../durableCommit/durableCommitTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface EpisodicMemoryValidatorOptions {
    readonly maxPayloadBytes?: number;
    readonly maxDepth?: number;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class EpisodicMemoryValidator {
    private readonly maxPayloadBytes;
    private readonly maxDepth;
    private readonly sanitizer;
    constructor(options?: EpisodicMemoryValidatorOptions);
    /**
     * EN: Defensively validates raw incoming payload for security threats.
     * Rejects prototype pollution (__proto__, constructor, prototype), null bytes,
     * excessive nesting (>10), and payloads exceeding size limits (64 KB).
     */
    defensivelyValidatePayload(payload: unknown, depth?: number): void;
    /**
     * EN: Validates the structural envelope of an EpisodicMemoryRequest.
     */
    validateRequestEnvelope(request: unknown): asserts request is EpisodicMemoryRequest;
    /**
     * EN: Validates that the input DurableCommitRecord satisfies commit authority rules.
     * Invariant: Only status === 'COMMITTED' may create authoritative episodic memory.
     */
    validateCommitAuthority(commitRecord: DurableCommitRecord): void;
    /**
     * EN: Validates task, tenant, step, execution, and version concurrency bindings.
     */
    validateBindings(commitRecord: DurableCommitRecord, authoritativeTask: AgentTask, context?: EpisodicMemoryContext, expectedTaskVersion?: number): void;
    /**
     * EN: Validates identifier strings against path traversal or reserved keywords.
     */
    validateIdentifierSafety(identifier: string, fieldName: string): void;
    /**
     * EN: Alias for validateIdentifierSafety to validate path safety of identifier tokens.
     */
    validatePathSafety(identifier: string, fieldName: string): void;
    /**
     * EN: Sanitizes data structures using DiagnosisSanitizer for safe logging and persistence.
     */
    sanitize<T>(data: T): T;
}
export declare const globalEpisodicMemoryValidator: EpisodicMemoryValidator;
