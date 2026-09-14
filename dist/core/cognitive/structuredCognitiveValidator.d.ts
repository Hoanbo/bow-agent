import { type CognitiveActionProposal, type CognitiveRuntimeTier } from './providerNeutralContracts.js';
export declare class StructuredCognitiveValidator {
    /**
     * Parses raw model output string and strictly validates against schema.
     * Fails closed by throwing CognitiveValidationError on any defect.
     */
    static parseAndValidate(rawText: string, context: {
        readonly tier: CognitiveRuntimeTier;
        readonly providerName: string;
        readonly modelName: string;
    }): CognitiveActionProposal;
    /**
     * Validates a parsed JavaScript object structure.
     */
    static validateParsedObject(parsed: any, rawText: string, context: {
        readonly tier: CognitiveRuntimeTier;
        readonly providerName: string;
        readonly modelName: string;
    }): CognitiveActionProposal;
    /**
     * Sanitizes parameter dictionaries defending against prototype pollution and invalid types.
     */
    private static sanitizeParameters;
    /**
     * Extracts JSON block from model response text.
     */
    private static extractJson;
}
