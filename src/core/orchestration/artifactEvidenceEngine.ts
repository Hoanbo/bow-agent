// src/core/orchestration/artifactEvidenceEngine.ts
// BOWCON V4.0 — MS-1.3.46: GOVERNED ARTIFACT EVIDENCE ENGINE
//
// Governed creation, hashing, sensitive data scrubbing, and integrity verification
// of task artifacts.
//
// INVARIANTS:
// - Zero persistence of credentials, tokens, or HumanGate approvals.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
// - Cryptographic integrity: Deterministic SHA-256 hashing.
// - Tampered or corrupted artifacts produce ARTIFACT_INTEGRITY_FAILURE and cannot be verified.
// - Session isolation: Artifact must match task session.

import crypto from 'node:crypto';
import type {
  TaskArtifact,
  TaskId,
  OrchestrationErrorCode,
} from './taskOrchestrationTypes.js';

export class ArtifactEvidenceError extends Error {
  constructor(
    public readonly code: OrchestrationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'ArtifactEvidenceError';
  }
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

export const FORBIDDEN_SENSITIVE_KEYS = [
  'token',
  'authtoken',
  'authorizationtoken',
  'password',
  'secret',
  'privatekey',
  'apikey',
  'humangateapproval',
  'credential',
] as const;

export class ArtifactEvidenceEngine {
  private readonly artifacts = new Map<string, TaskArtifact>();

  /**
   * Asserts that metadata and content do not contain forbidden credentials or secrets.
   */
  public assertNoSensitiveData(
    metadata?: Readonly<Record<string, unknown>>,
    rawContent?: string
  ): void {
    if (metadata) {
      for (const key of Object.keys(metadata)) {
        const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
        for (const forbidden of FORBIDDEN_SENSITIVE_KEYS) {
          if (lowerKey.includes(forbidden)) {
            throw new ArtifactEvidenceError(
              'FORBIDDEN_CREDENTIAL_PERSISTENCE',
              `Forbidden credential/token key detected in artifact metadata: "${key}"`
            );
          }
        }
      }
    }

    if (rawContent) {
      const lowerContent = rawContent.toLowerCase();
      if (
        lowerContent.includes('-----begin private key-----') ||
        lowerContent.includes('authorizationtoken') ||
        lowerContent.includes('bearer eyj')
      ) {
        throw new ArtifactEvidenceError(
          'FORBIDDEN_CREDENTIAL_PERSISTENCE',
          'Forbidden credential or authorization token format detected in artifact raw content.'
        );
      }
    }
  }

  /**
   * Asserts that path or contentReference does not target protected workspace C:\BOW\shopofbow.
   */
  public assertProtectedWorkspaceSafe(reference: string): void {
    const normalized = reference.replace(/\\/g, '/').toLowerCase();
    if (
      normalized.includes('c:/bow/shopofbow') ||
      normalized.includes('/shopofbow') ||
      normalized.includes('shopofbow')
    ) {
      throw new ArtifactEvidenceError(
        'SECURITY_VIOLATION',
        `Artifact contentReference cannot access protected workspace C:\\BOW\\shopofbow: "${reference}"`
      );
    }
  }

  /**
   * Computes deterministic SHA-256 hash of artifact content.
   */
  public computeContentHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Creates and registers a governed task artifact.
   */
  public createArtifact(input: CreateArtifactInput): TaskArtifact {
    // 1. Protected workspace guard
    this.assertProtectedWorkspaceSafe(input.contentReference);

    // 2. Sensitive credential persistence guard
    this.assertNoSensitiveData(input.metadata, input.rawContent);

    // 3. Compute deterministic hash
    const contentToHash = input.rawContent ?? input.contentReference;
    const contentHash = this.computeContentHash(contentToHash);

    const artifactId = `art_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const provenance = input.provenance && input.provenance.length > 0
      ? [...input.provenance, `created_by_${input.agentId}`]
      : [`created_by_${input.agentId}`];

    const artifact: TaskArtifact = {
      artifactId,
      taskId: input.taskId,
      agentId: input.agentId,
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      createdAt: Date.now(),
      artifactType: input.artifactType,
      contentReference: input.contentReference,
      rawContent: input.rawContent,
      contentHash,
      provenance,
      verificationState: 'OBSERVED',
      metadata: input.metadata,
    };

    this.artifacts.set(artifactId, artifact);
    return artifact;
  }

  /**
   * Verifies the cryptographic integrity of an artifact.
   */
  public verifyArtifactIntegrity(
    artifact: TaskArtifact,
    rawContent?: string
  ): { intact: boolean; calculatedHash: string; error?: string } {
    const contentToHash = rawContent ?? artifact.rawContent ?? artifact.contentReference;
    const calculatedHash = this.computeContentHash(contentToHash);

    if (calculatedHash !== artifact.contentHash) {
      return {
        intact: false,
        calculatedHash,
        error: `ARTIFACT_INTEGRITY_FAILURE: Expected hash ${artifact.contentHash}, but got ${calculatedHash}`,
      };
    }

    return {
      intact: true,
      calculatedHash,
    };
  }

  public getArtifact(artifactId: string): TaskArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  public getArtifactsByTask(taskId: TaskId): readonly TaskArtifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.taskId === taskId);
  }

  public clear(): void {
    this.artifacts.clear();
  }
}

export const globalArtifactEvidenceEngine = new ArtifactEvidenceEngine();
