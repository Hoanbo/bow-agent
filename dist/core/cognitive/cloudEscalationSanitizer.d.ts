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
export declare class CloudEscalationSanitizer {
    /**
     * Sanitizes a string removing any detected credentials, secrets, or internal paths.
     */
    static sanitizeString(input: string): {
        readonly sanitized: string;
        readonly redactedCount: number;
        readonly categories: string[];
    };
    /**
     * Performs end-to-end sanitization of a CognitivePromptContext before cloud escalation.
     */
    static sanitize(context: CognitivePromptContext): SanitizedContextResult;
}
