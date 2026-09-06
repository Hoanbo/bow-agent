const REFERENCE = /(?:^|[^\p{L}\p{N}_])(it|that|this|nó|đó|đơn đầu tiên|cái đó|việc đó)(?=$|[^\p{L}\p{N}_])/giu;
// EN: Resolve against only the supplied, already-scoped context. No process-global state exists.
// VI: Chỉ phân giải dựa trên context đã được scope truyền vào. Không tồn tại trạng thái global của process.
export function resolveSemanticReferences(text, turns = []) {
    const references = [];
    for (const match of text.matchAll(REFERENCE)) {
        const phrase = match[1];
        const candidates = turns.filter(turn => turn.content.trim().split(/\s+/).length > 2).slice(-3).reverse();
        if (candidates.length === 1) {
            references.push({ phrase, resolved: true, targetText: candidates[0].content, targetTurnId: candidates[0].id, confidence: 0.75 });
        }
        else {
            references.push({ phrase, resolved: false, confidence: 0 });
        }
    }
    return references;
}
