// src/core/context/contextRanker.ts
// BOWCON V4.0 — MULTI-DIMENSIONAL CONTEXT RANKING ALGORITHM (MILESTONE 1.3.7)
//
// Invariants:
// - INV-10: Deterministic ranking order:
//   1. Explicit user instructions (weight: 100)
//   2. Active unresolved tasks (weight: 85)
//   3. Current topic relevance (weight: 70)
//   4. Recency (weight: 50)
//   5. User preferences (weight: 40)
//   6. Durable memory relevance (weight: 30)
//   7. Older historical context (weight: 15)
// - INV-3: Selects relevant items rather than dumping all historical turns.
export class ContextRanker {
    /**
     * Computes a deterministic composite relevance score for a context item.
     */
    scoreItem(item, activeTopic, indexFromEnd = 0) {
        let score = 0;
        // 1. Explicit user instruction
        if (item.isExplicitInstruction) {
            score += 100;
        }
        // 2. Active unresolved task
        if (item.isUnresolvedTask) {
            score += 85;
        }
        // 3. Current topic match
        if (activeTopic && item.topic && item.topic.toLowerCase() === activeTopic.toLowerCase()) {
            score += 70;
        }
        // 4. Recency bonus with linear decay: 50 for most recent, down to 10
        const recencyScore = Math.max(10, 50 - indexFromEnd * 5);
        score += recencyScore;
        // 5. User preference classification
        if (item.classification === 'USER') {
            score += 40;
        }
        // 6. Durable classification
        if (item.classification === 'DURABLE') {
            score += 30;
        }
        // 7. Importance multiplier
        switch (item.importance) {
            case 'CRITICAL':
                score += 25;
                break;
            case 'HIGH':
                score += 15;
                break;
            case 'MEDIUM':
            case 'NORMAL':
                score += 5;
                break;
            case 'LOW':
                score -= 10;
                break;
            case 'TRIVIAL':
            default:
                score -= 20;
                break;
        }
        return score;
    }
    /**
     * Ranks candidate context items and returns the top items sorted by score descending.
     */
    rankItems(items, options = {}) {
        if (!items || items.length === 0)
            return [];
        const total = items.length;
        const scored = items.map((item, idx) => {
            const indexFromEnd = total - 1 - idx;
            const score = this.scoreItem(item, options.activeTopic, indexFromEnd);
            return { item, score };
        });
        // Deterministic sort: score descending, then id ascending for tie-breaking
        scored.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.item.id.localeCompare(b.item.id);
        });
        const limit = options.maxItems || items.length;
        return scored.slice(0, limit).map(s => s.item);
    }
}
export const globalContextRanker = new ContextRanker();
