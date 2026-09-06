import type { IntentInterpretationInput, SemanticIntent } from './intentTypes.js';
export interface IntentEngine {
    interpret(input: IntentInterpretationInput): SemanticIntent;
}
export declare class DeterministicIntentEngine implements IntentEngine {
    interpret(input: IntentInterpretationInput): SemanticIntent;
}
export declare class IntentService {
    private readonly engine;
    constructor(engine?: IntentEngine);
    interpret(input: IntentInterpretationInput): SemanticIntent;
}
