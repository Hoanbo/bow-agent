import type { AgentContext, AgentMessage } from './types.js';
import { resetGeminiHistory } from '../gemini/geminiClient.js';
import { classifyKnowledgeGap, extractKnowledgeGapMetadata, normalizeKnowledgeQuestion, deduplicateKnowledgeGaps, isKnowledgeGapCandidate } from '../knowledge/knowledgeGapDetector.js';
import { aggregateKnowledgeGapEvents } from '../knowledge/knowledgeGapAggregator.js';
export * from './types.js';
export { resetGeminiHistory };
export { validateAction, validateAgentAction } from './actionValidator.js';
export { extractDuration, matchPlanByDuration, resolveMultiIntent, resolveAgentIntent, isAmbiguousDemandQuery } from './intentResolver.js';
export { resetPlanContext } from './sessionContext.js';
export { classifyKnowledgeGap, extractKnowledgeGapMetadata, normalizeKnowledgeQuestion, deduplicateKnowledgeGaps, isKnowledgeGapCandidate, aggregateKnowledgeGapEvents, };
/**
 * BOW AGENT V3 — Master Orchestrator
 * Pipeline:
 * 1. Try V3 Gemini Brain (NLU, Multi-turn context, Safe Tool Calling)
 * 2. If Gemini unavailable, rate-limited, or timed out -> Auto-fallback to V2 Deterministic Engine
 * 3. Asynchronously record per-turn observability and knowledge gap candidates
 */
export declare function processAgentMessage(userText: string, context: AgentContext): Promise<AgentMessage>;
/**
 * BOW AGENT V2 — Deterministic Engine (Tool Execution + Action Planning)
 */
export declare function processAgentMessageV2(userText: string, context: AgentContext): Promise<AgentMessage>;
