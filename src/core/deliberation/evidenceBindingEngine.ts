// src/core/deliberation/evidenceBindingEngine.ts
// BOWCON V4.0 — MS-1.5.05: EVIDENCE BINDING ENGINE
// Component 1020 — REAL
//
// Invariants:
// RETRIEVED_CONTEXT != VERIFIED_FACT
// EVIDENCE != PROOF
// USER_STOP > ALL_MUTATION
// STRICT_TENANT_ISOLATION == TRUE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY

import crypto from 'node:crypto';
import {
  type EvidenceBinding,
  type EvidenceSourceType,
  DeliberationUserStopError,
  CrossTenantDeliberationError,
  computeEvidenceBindingHash,
} from './deliberationTypes.js';
import { DeliberationValidator } from './deliberationValidator.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CloudEscalationSanitizer } from '../cognitive/cloudEscalationSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface EvidenceBindingOptions {
  readonly sanitizer?: DiagnosisSanitizer;
  readonly userStopProvider?: () => boolean;
}

export class EvidenceBindingEngine {
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly userStopProvider: () => boolean;

  constructor(options?: EvidenceBindingOptions) {
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * Binds an evidence item from an allowed source into an immutable EvidenceBinding.
   *
   * Invariant: RETRIEVED_CONTEXT != VERIFIED_FACT.
   * Semantic memory references are strictly advisory and marked isEmpiricallyVerified: false.
   */
  public bindEvidence(input: {
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly sourceType: EvidenceSourceType;
    readonly sourceReferenceId: string;
    readonly statement: string;
    readonly confidence?: number;
    readonly isEmpiricallyVerified?: boolean;
    readonly metadata?: Readonly<Record<string, unknown>>;
  }, activeTenantId?: string): EvidenceBinding {
    // 1. Synchronous USER_STOP check
    if (this.userStopProvider()) {
      throw new DeliberationUserStopError('evidence_binding');
    }

    // 2. Tenant isolation check
    if (activeTenantId && input.tenantId !== activeTenantId) {
      throw new CrossTenantDeliberationError(input.tenantId, activeTenantId);
    }

    // 3. Sanitize evidence statement
    const sanitizedStatement = this.sanitizeText(input.statement);

    // 4. Grounding invariant: SEMANTIC_MEMORY_REFERENCE is advisory only
    const isEmpiricallyVerified =
      input.sourceType === 'SEMANTIC_MEMORY_REFERENCE'
        ? false
        : (input.isEmpiricallyVerified ?? (
            input.sourceType === 'USER_DIRECTIVE' ||
            input.sourceType === 'CANONICAL_EPISODIC_MEMORY' ||
            input.sourceType === 'SYSTEM_EMPIRICAL_OBSERVATION'
          ));

    const confidence = Math.max(0.0, Math.min(1.0, input.confidence ?? 1.0));
    const boundAt = new Date().toISOString();

    const evidenceId = `ev_${crypto
      .createHash('sha256')
      .update(`${input.tenantId}:${input.sourceType}:${input.sourceReferenceId}:${boundAt}`, 'utf8')
      .digest('hex')
      .slice(0, 16)}`;

    const draft = {
      evidenceId,
      tenantId: input.tenantId.trim(),
      sessionId: input.sessionId?.trim(),
      sourceType: input.sourceType,
      sourceReferenceId: input.sourceReferenceId.trim(),
      statement: sanitizedStatement,
      confidence,
      isEmpiricallyVerified,
      metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined,
      boundAt,
    };

    const provenanceHash = computeEvidenceBindingHash(draft);

    const finalEvidence: EvidenceBinding = Object.freeze({
      ...draft,
      provenanceHash,
    });

    DeliberationValidator.validateEvidence(finalEvidence);
    return finalEvidence;
  }

  private sanitizeText(raw: string): string {
    const s1 = this.sanitizer.sanitizeString(raw || '');
    const s2 = CloudEscalationSanitizer.sanitizeString(s1).sanitized;
    return s2
      .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_GOOGLE_KEY]')
      .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED_ANTHROPIC_KEY]')
      .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(?:password|passwd|pwd)\s*=\s*[^\s,;]+/gi, '[REDACTED_PASSWORD]')
      .replace(/(?:api_key|apikey)\s*=\s*[^\s,;]+/gi, '[REDACTED_API_KEY]')
      .replace(/[A-Za-z]:\\\\BOW\\\\shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/[A-Za-z]:[\\/]BOW[\\/]shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/shopofbow/gi, '[REDACTED_PROTECTED_WORKSPACE]')
      .trim();
  }
}

export const globalEvidenceBindingEngine = new EvidenceBindingEngine();
