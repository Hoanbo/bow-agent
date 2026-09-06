import { parseIntent } from './intentParser.js';
import type { IntentInterpretationInput, SemanticIntent } from './intentTypes.js';

// EN: IntentService is a stateless abstraction boundary for today's deterministic parser and future engines.
// VI: IntentService là ranh giới trừu tượng không trạng thái cho parser xác định hôm nay và engine tương lai.
export interface IntentEngine { interpret(input: IntentInterpretationInput): SemanticIntent; }

export class DeterministicIntentEngine implements IntentEngine {
  public interpret(input: IntentInterpretationInput): SemanticIntent { return parseIntent(input); }
}

export class IntentService {
  constructor(private readonly engine: IntentEngine = new DeterministicIntentEngine()) {}
  public interpret(input: IntentInterpretationInput): SemanticIntent { return this.engine.interpret(input); }
}
