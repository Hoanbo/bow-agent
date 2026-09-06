// src/core/context/topicTracker.ts
// BOWCON V4.0 — DETERMINISTIC CONVERSATIONAL TOPIC TRACKER (MILESTONE 1.3.7)
//
// Invariants:
// - INV-8: Tracks activeTopic, previousTopic, topicConfidence, topicChanged, lastRelevantTurn.
// - Pure deterministic local keyword heuristics without external LLM/embedding API calls.
const TOPIC_PATTERNS = [
    {
        name: 'voice',
        keywords: ['voice', 'giọng nói', 'âm thanh', 'tts', 'speech', 'prosody', 'elevenlabs', 'openai tts', 'phát âm', 'đọc'],
        weight: 1.0,
    },
    {
        name: 'shop',
        keywords: ['shop', 'sản phẩm', 'product', 'đơn hàng', 'order', 'giá', 'price', 'mua', 'bán', 'thanh toán', 'doanh thu'],
        weight: 1.0,
    },
    {
        name: 'desktop',
        keywords: ['desktop', 'màn hình', 'screen', 'ứng dụng', 'app', 'cửa sổ', 'window', 'click', 'chuột', 'bàn phím'],
        weight: 1.0,
    },
    {
        name: 'governance',
        keywords: ['governance', 'phê duyệt', 'approval', 'token', 'idempotency', 'audit', 'kill switch', 'bảo mật', 'quyền'],
        weight: 1.0,
    },
    {
        name: 'memory',
        keywords: ['memory', 'nhớ', 'thói quen', 'habit', 'quy tắc', 'rule', 'boss profile', 'dự án', 'project'],
        weight: 1.0,
    },
    {
        name: 'database',
        keywords: ['database', 'cơ sở dữ liệu', 'postgres', 'postgresql', 'sql', 'query', 'bảng', 'table'],
        weight: 1.0,
    },
    {
        name: 'system',
        keywords: ['system', 'hệ thống', 'server', 'trạng thái', 'status', 'health', 'khởi động', 'reboot'],
        weight: 1.0,
    },
];
export class TopicTracker {
    /**
     * Detects active topic and confidence from text.
     */
    detectTopic(text) {
        const res = this.inferTopic(text);
        return { activeTopic: res.topic, topicConfidence: res.confidence };
    }
    /**
     * Infers candidate topic and score from text.
     */
    inferTopic(text) {
        if (!text || typeof text !== 'string') {
            return { topic: 'general', confidence: 0.5 };
        }
        const lower = text.toLowerCase();
        let bestTopic = 'general';
        let maxScore = 0;
        for (const tp of TOPIC_PATTERNS) {
            let score = 0;
            for (const kw of tp.keywords) {
                if (lower.includes(kw)) {
                    score += tp.weight;
                }
            }
            if (score > maxScore) {
                maxScore = score;
                bestTopic = tp.name;
            }
        }
        if (maxScore === 0) {
            return { topic: 'general', confidence: 0.5 };
        }
        // Normalize confidence between 0.6 and 0.98 based on match count
        const confidence = Math.min(0.98, 0.6 + maxScore * 0.15);
        return { topic: bestTopic, confidence };
    }
    /**
     * Updates existing topic state based on the latest conversational turn.
     */
    updateTopic(currentState, currentText, turnId) {
        const inferred = this.inferTopic(currentText);
        if (!currentState) {
            return {
                activeTopic: inferred.topic,
                previousTopic: undefined,
                topicConfidence: inferred.confidence,
                topicChanged: false,
                lastRelevantTurn: turnId,
            };
        }
        // Check for topic transition
        if (inferred.topic !== 'general' && inferred.topic !== currentState.activeTopic && inferred.confidence >= 0.65) {
            return {
                activeTopic: inferred.topic,
                previousTopic: currentState.activeTopic,
                topicConfidence: inferred.confidence,
                topicChanged: true,
                lastRelevantTurn: turnId || currentState.lastRelevantTurn,
            };
        }
        // Topic continuation
        return {
            activeTopic: currentState.activeTopic,
            previousTopic: currentState.previousTopic,
            topicConfidence: Math.max(currentState.topicConfidence * 0.95, inferred.confidence),
            topicChanged: false,
            lastRelevantTurn: inferred.topic === currentState.activeTopic ? turnId : currentState.lastRelevantTurn,
        };
    }
}
export const globalTopicTracker = new TopicTracker();
