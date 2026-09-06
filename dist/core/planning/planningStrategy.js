export function selectPlanningStrategy(context) {
    if (context.semanticIntent.requiresClarification || context.semanticIntent.confidence < 0.5)
        return 'CLARIFY';
    if (context.semanticIntent.actionability === 'INFORMATIONAL')
        return context.semanticIntent.references.some(reference => reference.resolved) ? 'CONTEXT_RESPONSE' : 'RESPOND';
    return 'ACTION';
}
