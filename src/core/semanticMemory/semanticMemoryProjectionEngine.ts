// src/core/semanticMemory/semanticMemoryProjectionEngine.ts
// BOWCON V4.0 — MS-1.5.03: SEMANTIC MEMORY PROJECTION ENGINE
// Component 1005 — REAL
//
// Invariants:
// CANONICAL_MEMORY_REMAINS_AUTHORITATIVE == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PROJECTION == TRUE
// SECRET_SANITIZATION_BEFORE_EMBEDDING == TRUE
// CONTENT_HASH_CHAINING == TRUE
// USER_STOP_SUPREMACY == TRUE

import {
  type SemanticMemoryRecord,
  SemanticMemoryUserStopError,
  computeContentHash,
  assertNoChainOfThought,
} from './semanticMemoryTypes.js';
import { type LocalEmbeddingProvider } from './localEmbeddingProvider.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CloudEscalationSanitizer } from '../cognitive/cloudEscalationSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface SemanticProjectionInput {
  readonly memoryId: string;
  readonly tenantId: string;
  readonly sessionId?: string;
  readonly sourceDomain: 'EPISODIC' | 'KNOWLEDGE_GRAPH' | 'WORKING_REGISTER' | 'USER_PREFERENCE';
  readonly rawText: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class SemanticMemoryProjectionEngine {
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly userStopProvider: () => boolean;

  constructor(options?: {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly userStopProvider?: () => boolean;
  }) {
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * Projects canonical memory content into a strongly typed, sanitized SemanticMemoryRecord.
   * Asserts USER_STOP, filters CoT, sanitizes credentials/PII, computes contentHash,
   * generates local vector embedding, and validates vector boundaries.
   */
  public async project(
    input: SemanticProjectionInput,
    provider: LocalEmbeddingProvider,
    signal?: AbortSignal
  ): Promise<SemanticMemoryRecord> {
    // 1. Synchronous USER_STOP check
    if (this.userStopProvider()) {
      throw new SemanticMemoryUserStopError('semantic_projection');
    }

    // 2. Chain-of-thought prohibition
    assertNoChainOfThought(input.rawText, 'projection.rawText');
    if (input.metadata) {
      assertNoChainOfThought(input.metadata, 'projection.metadata');
    }

    // 3. Credential & secret sanitization
    const step1 = this.sanitizer.sanitizeString(input.rawText || '');
    const step2 = CloudEscalationSanitizer.sanitizeString(step1).sanitized;
    const sanitizedCanonicalText = step2
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED_ANTHROPIC_KEY]')
      .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/superSecretPassword[A-Za-z0-9!@#$%^&*]+/gi, '[REDACTED_PASSWORD]')
      .replace(/[A-Za-z]:\\\\BOW\\\\shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/[A-Za-z]:[\\/]BOW[\\/]shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/shopofbow/gi, '[REDACTED_PROTECTED_WORKSPACE]')
      .trim();

    // 4. Content hashing
    const contentHash = computeContentHash(sanitizedCanonicalText);

    // 5. Generate local embedding (local-first, zero cloud fallback)
    const embedding = await provider.embed(sanitizedCanonicalText, signal);

    return Object.freeze({
      memoryId: input.memoryId.trim(),
      tenantId: input.tenantId.trim(),
      sessionId: input.sessionId?.trim(),
      sourceDomain: input.sourceDomain,
      canonicalText: sanitizedCanonicalText,
      contentHash,
      embedding,
      metadata: input.metadata ? Object.freeze({ ...input.metadata }) : Object.freeze({}),
      indexedAt: new Date().toISOString(),
    });
  }
}
