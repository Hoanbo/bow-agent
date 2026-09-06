import { classifyIntent } from './actionClassifier.js';
import { extractEntities } from './entityExtractor.js';
import { resolveSemanticReferences } from './referenceResolver.js';
import { validateIntentInput } from './semanticValidator.js';
import type { ClarificationRequirement } from './clarification.js';
import type { CandidateAction, IntentInterpretationInput, SemanticIntent } from './intentTypes.js';

const requiredEntityByIntent: Partial<Record<SemanticIntent['intentType'], string>> = {
  CANCEL_REQUEST: 'order', DELETE_REQUEST: 'identifier', UPDATE_REQUEST: 'identifier', CONFIGURATION_REQUEST: 'setting',
};

// EN: Parse text into a bounded, deterministic representation. This function has no I/O or side effects.
// VI: Phân tích text thành biểu diễn có giới hạn, xác định. Hàm này không có I/O hoặc tác động phụ.
export function parseIntent(input: IntentInterpretationInput): SemanticIntent {
  const validation = validateIntentInput(input);
  const sourceText = typeof input?.userText === 'string' ? input.userText : '';
  const normalizedText = sourceText.trim().replace(/\s+/g, ' ').toLowerCase();
  if (validation.length) return { intentType: 'UNKNOWN', confidence: 0, confidenceLevel: 'LOW', entities: [], parameters: {}, references: [], missingParameters: [], ambiguities: [], clarification: validation, requiresClarification: true, actionability: 'INFORMATIONAL', sourceText, normalizedText, candidateAction: undefined };

  const classified = classifyIntent(normalizedText);
  const turns = input.context?.recentTurns || input.workingMemory || [];
  const references = resolveSemanticReferences(sourceText, turns);
  const entities = extractEntities(sourceText);
  for (const reference of references) {
    if (reference.resolved && reference.targetText) {
      for (const entity of extractEntities(reference.targetText)) {
        if (!entities.some(existing => existing.type === entity.type && existing.normalizedValue === entity.normalizedValue)) entities.push(entity);
      }
    }
  }
  const missingParameters: string[] = [];
  const clarifications: ClarificationRequirement[] = references.filter(reference => !reference.resolved).map(reference => ({ reason: 'UNRESOLVED_REFERENCE', reference: reference.phrase }));
  const required = requiredEntityByIntent[classified.intentType];
  if (required && !entities.some(entity => entity.type === required)) {
    missingParameters.push(required);
    clarifications.push({ reason: 'MISSING_PARAMETER' as const, parameter: required });
  }
  if (classified.intentType === 'UNKNOWN') clarifications.push({ reason: 'UNSUPPORTED_INTENT' });
  const confidence = Math.max(0, Math.min(1, clarifications.length ? Math.min(classified.confidence, 0.4) : classified.confidence));
  const candidateAction: CandidateAction | undefined = classified.intentType === 'UNKNOWN' ? undefined : {
    intentType: classified.intentType, actionability: classified.actionability,
    entityType: entities[0]?.type, parameters: Object.freeze(Object.fromEntries(entities.filter(entity => entity.type === 'order' || entity.type === 'identifier' || entity.type === 'setting').map(entity => [entity.type === 'order' ? 'orderId' : entity.type, entity.value]))),
  };
  return Object.freeze({ intentType: classified.intentType, confidence, confidenceLevel: confidence >= 0.8 ? 'HIGH' : confidence >= 0.5 ? 'MEDIUM' : 'LOW', entities: Object.freeze(entities), parameters: candidateAction?.parameters || {}, references: Object.freeze(references), missingParameters: Object.freeze(missingParameters), ambiguities: Object.freeze(references.filter(reference => !reference.resolved).map(reference => reference.phrase)), clarification: Object.freeze(clarifications), requiresClarification: clarifications.length > 0, actionability: classified.actionability, sourceText, normalizedText, candidateAction });
}
