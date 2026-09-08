import type { CognitiveIntent, CognitiveRiskLevel } from './cognitiveTypes.js';
export interface IntentClassificationResult {
    readonly intent: CognitiveIntent;
    readonly confidence: number;
    readonly recommendedCapability: string;
    readonly targetEntity?: string;
    readonly riskLevel: CognitiveRiskLevel;
    readonly rationale: string;
}
export declare class IntentClassifier {
    /**
     * Classifies an input string into one of the 13 authoritative intent categories.
     */
    static classify(input: string): IntentClassificationResult;
}
