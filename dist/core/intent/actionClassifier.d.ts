import type { Actionability, IntentType } from './intentTypes.js';
export declare function classifyIntent(normalizedText: string): {
    intentType: IntentType;
    actionability: Actionability;
    confidence: number;
};
