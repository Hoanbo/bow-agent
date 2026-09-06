// src/core/context/conversationContext.ts
// BOWCON V4.0 — CONVERSATION CONTEXT DATA MODELS & SCHEMAS (MILESTONE 1.3.7)
//
// EN:
// Defines the core data types for the Conversation Context subsystem.
// A ConversationContextSnapshot is an immutable, point-in-time view of what
// the agent knows about the current conversation: recent turns, topics,
// detected memories, unresolved tasks, and resolved references.
//
// VI:
// Định nghĩa các kiểu dữ liệu cốt lõi cho hệ thống Conversation Context (Ngữ cảnh hội thoại).
// ConversationContextSnapshot là một chụp ảnh (snapshot) bất biến của những gì agent
// biết về cuộc hội thoại hiện tại: các lượt gần đây, chủ đề, những gì có thể được phát hiện
// trong bộ nhớ, nhiệm vụ chưa giải quyết, và các tham chiếu đã được xác định.
//
// Invariants (Bất biến):
// - INV-1 & INV-2: Phạm vi chỉ trong ${userId}::${sessionId}.
// - INV-4: Mọi mục bộ nhớ được phân loại là EPHEMERAL, SESSION, USER, hoặc DURABLE.
// - INV-6: Giới hạn xác định cho số lượt, ký tự và mục ngữ cảnh.
// - INV-11: Context snapshots là bản sao bất biến — không thể thay đổi sau khi tạo.
// - INV-15: Bảo vệ chống prototype pollution trên tất cả đầu vào cấu hình.
export const DEFAULT_CONTEXT_CONFIG = {
    maxTurns: 20,
    maxCharacters: 8000,
    maxContextItems: 15,
    maxRecentTurns: 6,
    compactionThreshold: 16,
    maxDurableMemoryItems: 5,
    maxSessionMemoryItems: 10,
    referenceResolutionThreshold: 0.6,
    topicConfidenceThreshold: 0.5,
};
export class ContextSecurityError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ContextSecurityError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
/**
 * Validates candidate configuration object against ContextConfig schema.
 * Rejects prototype pollution payloads fail-closed.
 */
export function validateContextConfig(config) {
    const errors = [];
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { valid: false, errors: ['ContextConfig must be a non-null object'] };
    }
    const raw = config;
    // Prototype pollution defense
    if (Object.prototype.hasOwnProperty.call(raw, '__proto__') ||
        Object.prototype.hasOwnProperty.call(raw, 'constructor') ||
        Object.prototype.hasOwnProperty.call(raw, 'prototype')) {
        throw new ContextSecurityError('Prototype pollution payload detected in ContextConfig');
    }
    function checkInt(field, min, max, defaultVal) {
        const val = raw[field];
        if (val === undefined)
            return defaultVal;
        if (typeof val !== 'number' || isNaN(val) || !Number.isInteger(val) || val < min || val > max) {
            errors.push(`${String(field)} must be an integer between ${min} and ${max}, got: ${val}`);
            return defaultVal;
        }
        return val;
    }
    function checkFloat(field, min, max, defaultVal) {
        const val = raw[field];
        if (val === undefined)
            return defaultVal;
        if (typeof val !== 'number' || isNaN(val) || val < min || val > max) {
            errors.push(`${String(field)} must be a float between ${min} and ${max}, got: ${val}`);
            return defaultVal;
        }
        return val;
    }
    const maxTurns = checkInt('maxTurns', 2, 100, DEFAULT_CONTEXT_CONFIG.maxTurns);
    const maxCharacters = checkInt('maxCharacters', 500, 100000, DEFAULT_CONTEXT_CONFIG.maxCharacters);
    const maxContextItems = checkInt('maxContextItems', 1, 50, DEFAULT_CONTEXT_CONFIG.maxContextItems);
    const maxRecentTurns = checkInt('maxRecentTurns', 1, 20, DEFAULT_CONTEXT_CONFIG.maxRecentTurns);
    const compactionThreshold = checkInt('compactionThreshold', 2, 100, DEFAULT_CONTEXT_CONFIG.compactionThreshold);
    const maxDurableMemoryItems = checkInt('maxDurableMemoryItems', 1, 20, DEFAULT_CONTEXT_CONFIG.maxDurableMemoryItems);
    const maxSessionMemoryItems = checkInt('maxSessionMemoryItems', 1, 30, DEFAULT_CONTEXT_CONFIG.maxSessionMemoryItems);
    const referenceResolutionThreshold = checkFloat('referenceResolutionThreshold', 0.1, 1.0, DEFAULT_CONTEXT_CONFIG.referenceResolutionThreshold);
    const topicConfidenceThreshold = checkFloat('topicConfidenceThreshold', 0.1, 1.0, DEFAULT_CONTEXT_CONFIG.topicConfidenceThreshold);
    if (compactionThreshold > maxTurns) {
        errors.push(`compactionThreshold (${compactionThreshold}) cannot exceed maxTurns (${maxTurns})`);
    }
    if (maxRecentTurns > maxTurns) {
        errors.push(`maxRecentTurns (${maxRecentTurns}) cannot exceed maxTurns (${maxTurns})`);
    }
    if (errors.length > 0) {
        return { valid: false, errors };
    }
    return {
        valid: true,
        config: {
            maxTurns,
            maxCharacters,
            maxContextItems,
            maxRecentTurns,
            compactionThreshold,
            maxDurableMemoryItems,
            maxSessionMemoryItems,
            referenceResolutionThreshold,
            topicConfidenceThreshold,
        },
    };
}
/**
 * Serializes a conversation context snapshot into JSON.
 */
export function serializeSnapshot(snapshot) {
    return JSON.stringify(snapshot);
}
/**
 * Deserializes a snapshot with safe fallback on malformed/corrupted data.
 */
export function deserializeSnapshot(raw) {
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid snapshot format');
        }
        return {
            userId: String(parsed.userId || 'unknown'),
            sessionId: String(parsed.sessionId || 'unknown'),
            activeTopic: String(parsed.activeTopic || 'general'),
            previousTopic: parsed.previousTopic ? String(parsed.previousTopic) : undefined,
            topicConfidence: typeof parsed.topicConfidence === 'number' ? parsed.topicConfidence : 0.5,
            recentTurns: Array.isArray(parsed.recentTurns) ? parsed.recentTurns : [],
            relevantMemories: Array.isArray(parsed.relevantMemories) ? parsed.relevantMemories : [],
            unresolvedTasks: Array.isArray(parsed.unresolvedTasks) ? parsed.unresolvedTasks : [],
            explicitInstructions: Array.isArray(parsed.explicitInstructions) ? parsed.explicitInstructions : [],
            resolvedReferences: Array.isArray(parsed.resolvedReferences) ? parsed.resolvedReferences : [],
            compactionState: parsed.compactionState || undefined,
            totalEstimatedCharacters: typeof parsed.totalEstimatedCharacters === 'number' ? parsed.totalEstimatedCharacters : 0,
        };
    }
    catch {
        return {
            userId: 'unknown',
            sessionId: 'unknown',
            activeTopic: 'general',
            topicConfidence: 0.0,
            recentTurns: [],
            relevantMemories: [],
            unresolvedTasks: [],
            explicitInstructions: [],
            resolvedReferences: [],
            totalEstimatedCharacters: 0,
        };
    }
}
