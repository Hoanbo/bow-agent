// src/core/context/contextClassifier.ts
// BOWCON V4.0 — CONTEXT CLASSIFIER & INTENT DETECTOR (MILESTONE 1.3.7)
//
// Invariants:
// - INV-4: Classifies into EPHEMERAL, SESSION, USER, or DURABLE.
// - INV-5: Explicit memory priority ("remember this", "from now on", "always", "never").
// - Does not automatically promote casual chat to permanent durable memory.

import {
  ContextClassification,
  ContextImportance,
  ContextItem,
  ConversationTurn,
} from './conversationContext.js';

const DURABLE_PATTERNS: RegExp[] = [
  /(?:^|[^\p{L}\p{N}])(?:remember\s+this|hãy\s+nhớ\s+rằng|nhớ\s+điều\s+này|ghi\s+nhớ|nhớ\s+kỹ|durable\s+memory|lưu\s+lâu\s+dài)(?=[^\p{L}\p{N}]|$)/iu,
  /(?:^|[^\p{L}\p{N}])(?:from\s+now\s+on|từ\s+bây\s+giờ|từ\s+giờ\s+trở\s+đi|từ\s+nay)(?=[^\p{L}\p{N}]|$)/iu,
  /(?:^|[^\p{L}\p{N}])(?:always\s+(?:do|use|respond)|luôn\s+luôn|luôn\s+làm|luôn\s+trả\s+lời)(?=[^\p{L}\p{N}]|$)/iu,
  /(?:^|[^\p{L}\p{N}])(?:never\s+(?:do|use|respond)|không\s+bao\s+giờ|tuyệt\s+đối\s+không|đừng\s+bao\s+giờ)(?=[^\p{L}\p{N}]|$)/iu,
  /(?:^|[^\p{L}\p{N}])(?:quy\s+tắc\s+mới|thiết\s+lập\s+quy\s+tắc|rule\s*:|policy\s*:)(?=[^\p{L}\p{N}]|$)/iu,
];

const USER_PREFERENCE_PATTERNS: RegExp[] = [
  /(?:^|[^\p{L}\p{N}])(?:my\s+preference\s+is|sở\s+thích\s+của\s+tôi|tôi\s+thích|tôi\s+chuộng|prefer(?:ence)?|i\s+prefer)(?=[^\p{L}\p{N}]|$)/iu,
  /(?:^|[^\p{L}\p{N}])(?:call\s+me|hãy\s+gọi\s+tôi\s+là|xưng\s+hô\s+với\s+tôi|tên\s+tôi\s+là|tôi\s+tên\s+là)(?=[^\p{L}\p{N}]|$)/iu,
  /(?:^|[^\p{L}\p{N}])(?:thói\s+quen\s+của\s+tôi|phong\s+cách\s+của\s+tôi)(?=[^\p{L}\p{N}]|$)/iu,
];

const UNRESOLVED_TASK_PATTERNS: RegExp[] = [
  /(?:^|[^\p{L}\p{N}])(?:hãy|vui\s+lòng|cần|làm\s+giúp|execute|run|implement|build|fix|sửa|tạo|cập\s+nhật)(?=[^\p{L}\p{N}]|$)/iu,
  /(?:^|[^\p{L}\p{N}])(?:đang\s+làm|chưa\s+xong|tiếp\s+tục|pending|in\s+progress|waiting\s+for)(?=[^\p{L}\p{N}]|$)/iu,
];

const EPHEMERAL_PATTERNS: RegExp[] = [
  /^(?:chào|xin\s+chào|hi|hello|hey|bye|tạm\s+biệt|cảm\s+ơn|thanks|thank\s+you|ok|okay|vâng|dạ|rõ)(?=[^\p{L}\p{N}]|$)/iu,
  /^(?:thời\s+gian\s+bây\s+giờ|mấy\s+giờ\s+rồi|hôm\s+nay\s+ngày\s+mấy|what\s+time\s+is\s+it)(?=[^\p{L}\p{N}]|$)/iu,
];

export interface ClassificationResult {
  classification: ContextClassification;
  importance: ContextImportance;
  isExplicitInstruction: boolean;
  isUnresolvedTask: boolean;
  detectedCues: string[];
}

/**
 * Deterministically classifies conversational text into memory tiers and importance.
 */
export function classifyTurn(text: string, sender: 'user' | 'agent' | 'system'): ClassificationResult {
  const trimmed = (text || '').trim();
  const lower = trimmed.toLowerCase();
  const detectedCues: string[] = [];

  // 1. Check for explicit durable memory instructions (Highest Priority: DURABLE, CRITICAL)
  for (const pattern of DURABLE_PATTERNS) {
    if (pattern.test(lower)) {
      detectedCues.push('explicit_durable_memory_intent');
      return {
        classification: 'DURABLE',
        importance: 'CRITICAL',
        isExplicitInstruction: true,
        isUnresolvedTask: false,
        detectedCues,
      };
    }
  }

  // 2. Check for user preference cues (USER, HIGH)
  for (const pattern of USER_PREFERENCE_PATTERNS) {
    if (pattern.test(lower)) {
      detectedCues.push('user_preference');
      return {
        classification: 'USER',
        importance: 'HIGH',
        isExplicitInstruction: true,
        isUnresolvedTask: false,
        detectedCues,
      };
    }
  }

  // 3. Check for unresolved tasks or action commands (only if user initiated)
  if (sender === 'user' && UNRESOLVED_TASK_PATTERNS.some(p => p.test(lower))) {
    detectedCues.push('unresolved_task');
    return {
      classification: 'SESSION',
      importance: 'HIGH',
      isExplicitInstruction: false,
      isUnresolvedTask: true,
      detectedCues,
    };
  }

  // 4. Check for ephemeral greetings, acknowledgements, or trivial queries
  if (EPHEMERAL_PATTERNS.some(p => p.test(lower)) && trimmed.split(/\s+/).length <= 4) {
    detectedCues.push('ephemeral_chatter');
    const isUltraShort = trimmed.split(/\s+/).length <= 2;
    return {
      classification: 'EPHEMERAL',
      importance: isUltraShort ? 'TRIVIAL' : 'LOW',
      isExplicitInstruction: false,
      isUnresolvedTask: false,
      detectedCues,
    };
  }

  // 5. Default working conversation turn (SESSION, NORMAL)
  return {
    classification: 'SESSION',
    importance: 'NORMAL',
    isExplicitInstruction: false,
    isUnresolvedTask: false,
    detectedCues: ['standard_session_turn'],
  };
}

/**
 * Extracts structured context items from a conversation turn.
 */
export function extractContextItems(turn: ConversationTurn, topic?: string): ContextItem[] {
  const classification = classifyTurn(turn.content, turn.sender);

  const item: ContextItem = {
    id: `ctx_${turn.id}_0`,
    content: turn.content,
    turnId: turn.id,
    classification: classification.classification,
    importance: classification.importance,
    topic,
    isExplicitInstruction: classification.isExplicitInstruction,
    isUnresolvedTask: classification.isUnresolvedTask,
    timestamp: turn.timestamp,
    metadata: {
      sender: turn.sender,
      cues: classification.detectedCues,
    },
  };

  return [item];
}
