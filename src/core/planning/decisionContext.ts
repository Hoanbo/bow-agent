import type { IntentInterpretationInput, SemanticIntent } from '../intent/intentTypes.js';
import type { DecisionContext } from './planningTypes.js';

const SECRET = /(bearer\s+\S+|api[_ -]?key|password\s*[:=]|private key|session[_ -]?secret)/iu;
const safeTurns = (turns: readonly { id: string; sender: string; content: string }[] = []) => turns.map(turn => ({ id: turn.id, sender: turn.sender, content: turn.content }));

// EN: Build an immutable, scoped decision input. Context from another user or session is never accepted here.
// VI: Xây dựng input quyết định bất biến, có scope. Context của user hoặc session khác không bao giờ được nhận ở đây.
export function createDecisionContext(input: IntentInterpretationInput, semanticIntent: SemanticIntent, currentState = 'MEMORY_LOADED'): DecisionContext {
  if (SECRET.test(semanticIntent.sourceText) || typeof input.userId !== 'string' || typeof input.sessionId !== 'string') throw new Error('Unsafe decision context');
  const conversationContext = safeTurns(input.context?.recentTurns);
  const relevantMemory = safeTurns(input.workingMemory);
  if ([...conversationContext, ...relevantMemory].some(turn => SECRET.test(turn.content))) throw new Error('Unsafe decision context');
  return Object.freeze({ userId: input.userId.trim(), sessionId: input.sessionId.trim(), semanticIntent, entities: Object.freeze(semanticIntent.entities.map(entity => Object.freeze({ type: entity.type, normalizedValue: entity.normalizedValue }))), conversationContext: Object.freeze(conversationContext.map(turn => Object.freeze({ ...turn }))), relevantMemory: Object.freeze(relevantMemory.map(turn => Object.freeze({ ...turn }))), candidateActions: Object.freeze(semanticIntent.candidateAction ? [semanticIntent.candidateAction] : []), governanceContext: Object.freeze({ requiresApprovalForRisk: 'HIGH', pdpRequired: true }), currentState });
}
