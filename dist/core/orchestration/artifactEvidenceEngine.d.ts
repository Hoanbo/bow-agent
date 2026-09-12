import type { TaskArtifact, TaskId, OrchestrationErrorCode } from './taskOrchestrationTypes.js';
export declare class ArtifactEvidenceError extends Error {
    readonly code: OrchestrationErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: OrchestrationErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
export interface CreateArtifactInput {
    readonly taskId: TaskId;
    readonly agentId: string;
    readonly deviceId: string;
    readonly sessionId: string;
    readonly artifactType: string;
    readonly contentReference: string;
    readonly rawContent?: string;
    readonly provenance?: readonly string[];
    readonly metadata?: Readonly<Record<string, unknown>>;
}
export declare const FORBIDDEN_SENSITIVE_KEYS: readonly ["token", "authtoken", "authorizationtoken", "password", "secret", "privatekey", "apikey", "humangateapproval", "credential"];
export declare class ArtifactEvidenceEngine {
    private readonly artifacts;
    /**
     * Asserts that metadata and content do not contain forbidden credentials or secrets.
     */
    assertNoSensitiveData(metadata?: Readonly<Record<string, unknown>>, rawContent?: string): void;
    /**
     * Asserts that path or contentReference does not target protected workspace C:\BOW\shopofbow.
     */
    assertProtectedWorkspaceSafe(reference: string): void;
    /**
     * Computes deterministic SHA-256 hash of artifact content.
     */
    computeContentHash(content: string): string;
    /**
     * Creates and registers a governed task artifact.
     */
    createArtifact(input: CreateArtifactInput): TaskArtifact;
    /**
     * Verifies the cryptographic integrity of an artifact.
     */
    verifyArtifactIntegrity(artifact: TaskArtifact, rawContent?: string): {
        intact: boolean;
        calculatedHash: string;
        error?: string;
    };
    getArtifact(artifactId: string): TaskArtifact | undefined;
    getArtifactsByTask(taskId: TaskId): readonly TaskArtifact[];
    clear(): void;
}
export declare const globalArtifactEvidenceEngine: ArtifactEvidenceEngine;
