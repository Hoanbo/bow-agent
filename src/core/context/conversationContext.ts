// src/core/context/conversationContext.ts
// BOWCON V4.0 — CONVERSATION CONTEXT DATA MODELS & SCHEMAS (MILESTONE 1.3.7)
//
// Invariants:
// - INV-1 & INV-2: Scoped strictly to ${userId}::${sessionId}.
// - INV-4: Every memory item is classified as EPHEMERAL, SESSION, USER, or DURABLE.
// - INV-6: Deterministic limits for turns, characters, and context items.
// - INV-11: Context snapshots are immutable copies.
// - INV-15: Prototype pollution protection on all configuration inputs.

export type ContextClassification = 'EPHEMERAL' | 'SESSION' | 'USER' | 'DURABLE';

export type ContextImportance = 'TRIVIAL' | 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

import type { ConversationTurn } from '../memory.js';
export type { ConversationTurn };

export interface ContextItem {
  id: string;
  content: string;
  turnId?: string;
  classification: ContextClassification;
  importance: ContextImportance;
  topic?: string;
  isExplicitInstruction?: boolean;
  isUnresolvedTask?: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ContextReference {
  phrase: string;
  targetText?: string;
  targetTurnId?: string;
  resolved: boolean;
  confidence: number;
}

export interface CompactionState {
  compacted: boolean;
  originalTurnCount: number;
  compactedTurnCount: number;
  summary?: string;
  timestamp: string;
}

export interface ConversationContextSnapshot {
  userId: string;
  sessionId: string;
  activeTopic: string;
  previousTopic?: string;
  topicConfidence: number;
  recentTurns: ConversationTurn[];
  relevantMemories: ContextItem[];
  unresolvedTasks: ContextItem[];
  explicitInstructions: ContextItem[];
  resolvedReferences: ContextReference[];
  compactionState?: CompactionState;
  totalEstimatedCharacters: number;
}

export interface ContextConfig {
  maxTurns?: number;
  maxCharacters?: number;
  maxContextItems?: number;
  maxRecentTurns?: number;
  compactionThreshold?: number;
  maxDurableMemoryItems?: number;
  maxSessionMemoryItems?: number;
  referenceResolutionThreshold?: number;
  topicConfidenceThreshold?: number;
}

export const DEFAULT_CONTEXT_CONFIG: Required<ContextConfig> = {
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
  constructor(message: string) {
    super(message);
    this.name = 'ContextSecurityError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validates candidate configuration object against ContextConfig schema.
 * Rejects prototype pollution payloads fail-closed.
 */
export function validateContextConfig(config: unknown): {
  valid: boolean;
  config?: Required<ContextConfig>;
  errors?: string[];
} {
  const errors: string[] = [];

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { valid: false, errors: ['ContextConfig must be a non-null object'] };
  }

  const raw = config as Record<string, any>;

  // Prototype pollution defense
  if (
    Object.prototype.hasOwnProperty.call(raw, '__proto__') ||
    Object.prototype.hasOwnProperty.call(raw, 'constructor') ||
    Object.prototype.hasOwnProperty.call(raw, 'prototype')
  ) {
    throw new ContextSecurityError('Prototype pollution payload detected in ContextConfig');
  }

  function checkInt(field: keyof ContextConfig, min: number, max: number, defaultVal: number): number {
    const val = raw[field];
    if (val === undefined) return defaultVal;
    if (typeof val !== 'number' || isNaN(val) || !Number.isInteger(val) || val < min || val > max) {
      errors.push(`${String(field)} must be an integer between ${min} and ${max}, got: ${val}`);
      return defaultVal;
    }
    return val;
  }

  function checkFloat(field: keyof ContextConfig, min: number, max: number, defaultVal: number): number {
    const val = raw[field];
    if (val === undefined) return defaultVal;
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
export function serializeSnapshot(snapshot: ConversationContextSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Deserializes a snapshot with safe fallback on malformed/corrupted data.
 */
export function deserializeSnapshot(raw: string): ConversationContextSnapshot {
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
  } catch {
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

