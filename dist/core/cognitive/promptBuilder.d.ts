import type { CognitivePromptContext } from './cognitiveTypes.js';
export declare class PromptBuilder {
    /**
     * Sanitizes text to remove confidential tokens, private keys, and passwords.
     * Fail-closed: if any suspicious secret pattern matches, it is replaced with [REDACTED_SECRET].
     */
    static sanitizeText(input: string): string;
    /**
     * Checks if an input contains known prompt injection attempts.
     */
    static detectPromptInjection(input: string): {
        isInjected: boolean;
        reason?: string;
    };
    /**
     * Neutralizes prompt injection by quoting and wrapping adversarial instructions as data, not commands.
     */
    static neutralizeInjection(input: string): string;
    /**
     * Constructs the structured multi-section prompt adhering to architectural separation.
     */
    static buildStructuredPrompt(context: CognitivePromptContext): string;
}
