// src/core/cognitive/cloudEscalationSanitizer.ts
// BOWCON V4.0 — MS-1.5.01: CLOUD ESCALATION PRIVACY & DATA SANITIZER
// Component 984 — REAL
//
// Invariants:
// NO_CREDENTIAL_EGRESS == TRUE
// MINIMAL_CONTEXT_TRANSMISSION == TRUE
// SANITIZE_BEFORE_TRANSMISSION == TRUE
// ZERO_LEAKAGE_TO_EXTERNAL_APIS == TRUE

import type { CognitivePromptContext } from './cognitiveTypes.js';

export interface SanitizationReport {
  readonly redactedCount: number;
  readonly redactedCategories: readonly string[];
  readonly wasModified: boolean;
  readonly sanitizedAt: string;
}

export interface SanitizedContextResult {
  readonly sanitizedContext: CognitivePromptContext;
  readonly report: SanitizationReport;
}

// Patterns identifying sensitive values requiring redaction
const SENSITIVE_PATTERNS: Array<{ readonly category: string; readonly regex: RegExp; readonly replacement: string }> = [
  // Google Gemini API keys (AIzaSy...)
  {
    category: 'GEMINI_API_KEY',
    regex: /AIzaSy[A-Za-z0-9_-]{33}/g,
    replacement: '[REDACTED_GEMINI_API_KEY]',
  },
  // Generic Bearer / JWT tokens
  {
    category: 'BEARER_TOKEN',
    regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: 'Bearer [REDACTED_TOKEN]',
  },
  // OpenAI / standard API keys (sk-...)
  {
    category: 'OPENAI_API_KEY',
    regex: /sk-[A-Za-z0-9]{20,}/g,
    replacement: '[REDACTED_API_KEY]',
  },
  // Password / Secret field assignments
  {
    category: 'PASSWORD_FIELD',
    regex: /(password|passwd|secret|api_key|apikey|private_key)\s*[:=]\s*["']?[A-Za-z0-9_!@#$%^&*()-]{4,}["']?/gi,
    replacement: '$1: "[REDACTED_SECRET]"',
  },
  // Sensitive environment variable names with values
  {
    category: 'ENV_SECRET',
    regex: /(GEMINI_API_KEY|OLLAMA_API_KEY|TOKEN|AUTH_SECRET)\s*=\s*[^\s\r\n]+/gi,
    replacement: '$1=[REDACTED_ENV]',
  },
  // Protected workspace references
  {
    category: 'PROTECTED_WORKSPACE_PATH',
    regex: /C:[\\/]BOW[\\/]shopofbow[^\s"']*/gi,
    replacement: '[PROTECTED_WORKSPACE_PATH]',
  },
  // Windows user profile directories
  {
    category: 'USER_PROFILE_PATH',
    regex: /[A-Z]:\\Users\\[A-Za-z0-9._-]+\\/gi,
    replacement: 'C:\\Users\\[REDACTED_USER]\\',
  },
  // SSH keys / PEM certificates
  {
    category: 'PRIVATE_KEY_BLOCK',
    regex: /-----BEGIN\s+[A-Z ]+PRIVATE KEY-----[\s\S]*?-----END\s+[A-Z ]+PRIVATE KEY-----/gi,
    replacement: '[REDACTED_PRIVATE_KEY_BLOCK]',
  },
];

export class CloudEscalationSanitizer {
  /**
   * Sanitizes a string removing any detected credentials, secrets, or internal paths.
   */
  public static sanitizeString(input: string): { readonly sanitized: string; readonly redactedCount: number; readonly categories: string[] } {
    if (!input || typeof input !== 'string') {
      return { sanitized: '', redactedCount: 0, categories: [] };
    }

    let result = input;
    let totalRedacted = 0;
    const detectedCategories = new Set<string>();

    for (const pattern of SENSITIVE_PATTERNS) {
      pattern.regex.lastIndex = 0;
      const matches = result.match(pattern.regex);
      if (matches && matches.length > 0) {
        totalRedacted += matches.length;
        detectedCategories.add(pattern.category);
        result = result.replace(pattern.regex, pattern.replacement);
      }
    }

    return {
      sanitized: result,
      redactedCount: totalRedacted,
      categories: Array.from(detectedCategories),
    };
  }

  /**
   * Performs end-to-end sanitization of a CognitivePromptContext before cloud escalation.
   */
  public static sanitize(context: CognitivePromptContext): SanitizedContextResult {
    let totalRedactions = 0;
    const categories = new Set<string>();

    const cleanField = (val?: string): string | undefined => {
      if (!val) return undefined;
      const res = this.sanitizeString(val);
      totalRedactions += res.redactedCount;
      res.categories.forEach((c) => categories.add(c));
      return res.sanitized;
    };

    const sanitizedContext: CognitivePromptContext = Object.freeze({
      systemContext: cleanField(context.systemContext),
      systemPrompt: cleanField(context.systemPrompt),
      userContext: cleanField(context.userContext),
      memoryContext: cleanField(context.memoryContext),
      taskContext: cleanField(context.taskContext),
      capabilitiesContext: cleanField(context.capabilitiesContext),
      policyConstraints: cleanField(context.policyConstraints),
      previousTurns: context.previousTurns
        ? Object.freeze(
            context.previousTurns.map((turn) =>
              Object.freeze({
                role: turn.role,
                content: this.sanitizeString(turn.content).sanitized,
                timestamp: turn.timestamp,
                targetEntity: turn.targetEntity ? this.sanitizeString(turn.targetEntity).sanitized : undefined,
              })
            )
          )
        : undefined,
    });

    const report: SanitizationReport = Object.freeze({
      redactedCount: totalRedactions,
      redactedCategories: Object.freeze(Array.from(categories)),
      wasModified: totalRedactions > 0,
      sanitizedAt: new Date().toISOString(),
    });

    return Object.freeze({
      sanitizedContext,
      report,
    });
  }
}
