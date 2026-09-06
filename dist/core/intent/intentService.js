import { parseIntent } from './intentParser.js';
export class DeterministicIntentEngine {
    interpret(input) { return parseIntent(input); }
}
export class IntentService {
    engine;
    constructor(engine = new DeterministicIntentEngine()) {
        this.engine = engine;
    }
    interpret(input) { return this.engine.interpret(input); }
}
