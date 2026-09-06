import type { ClarificationRequirement } from './clarification.js';
import type { IntentInterpretationInput } from './intentTypes.js';
export declare const MAX_INTENT_TEXT_LENGTH = 8192;
export declare function validateIntentInput(input: IntentInterpretationInput): ClarificationRequirement[];
export declare function isSafeRecord(value: unknown): value is Record<string, unknown>;
