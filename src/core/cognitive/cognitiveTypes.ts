// src/core/cognitive/cognitiveTypes.ts
// BOWCON V4.0 — MS-1.3.32: REAL BOWCON COGNITIVE PROVIDER & LOCAL INTELLIGENCE RUNTIME
//
// Invariants:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// HIGH_CONFIDENCE != EXECUTION_AUTHORITY
// COGNITIVE_PROVIDER != TOOL_REGISTRY
// FAILURE != BRAIN_DEATH

import { randomBytes } from 'node:crypto';

export const COGNITIVE_RUNTIME_VERSION = '4.0.0';

export type CognitiveProviderType = 'local-real' | 'ollama' | 'deterministic-fallback';

export type CognitiveIntent =
  | 'OBSERVE'
  | 'READ'
  | 'WRITE'
  | 'APPEND'
  | 'UPDATE'
  | 'SEARCH'
  | 'ANALYZE'
  | 'PLAN'
  | 'DECIDE'
  | 'COMMUNICATE'
  | 'QUERY'
  | 'SYSTEM'
  | 'UNKNOWN';

export type CognitiveDecisionType = 'PROCEED' | 'REQUIRE_APPROVAL' | 'REJECT' | 'CLARIFY';

export type CognitiveRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CognitiveConfidence {
  readonly score: number; // 0.0 to 1.0
  readonly calibrationRationale: string;
  readonly meetsExecutionThreshold: boolean;
}

export interface CognitivePlanStep {
  readonly stepIndex: number;
  readonly action: string;
  readonly target?: string;
  readonly parameters?: Record<string, unknown>;
  readonly requiredCapability?: string;
  readonly validationCriteria?: string;
}

export interface CognitivePlan {
  readonly planId: string;
  readonly steps: readonly CognitivePlanStep[];
  readonly summary: string;
  readonly estimatedRisk: CognitiveRiskLevel;
  readonly requiredCapabilities: readonly string[];
}

export interface CognitiveDecision {
  readonly decisionType: CognitiveDecisionType;
  readonly riskLevel: CognitiveRiskLevel;
  readonly requiredCapabilities: readonly string[];
  readonly requiresApproval: boolean;
  readonly executionEligibility: boolean;
  readonly reasonSummary: string;
}

export interface CognitiveStageTrace {
  readonly stage: string;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly durationMs: number;
  readonly metadata?: Record<string, unknown>;
}

export interface CognitiveTrace {
  readonly traceId: string;
  readonly requestId: string;
  readonly providerType: CognitiveProviderType;
  readonly modelName: string;
  readonly latencyMs: number;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly stages: readonly CognitiveStageTrace[];
}

export interface CognitiveToolCandidate {
  readonly toolName: string;
  readonly toolArgs: Record<string, unknown>;
  readonly intent: CognitiveIntent;
  readonly capability: string;
}

export interface CognitiveResult {
  readonly requestId: string;
  readonly provider: CognitiveProviderType;
  readonly model: string;
  readonly intent: CognitiveIntent;
  readonly interpretation: string;
  readonly reasoningSummary: string;
  readonly plan: CognitivePlan;
  readonly decision: CognitiveDecision;
  readonly confidence: CognitiveConfidence;
  readonly requestedCapabilities: readonly string[];
  readonly riskLevel: CognitiveRiskLevel;
  readonly toolCandidates: readonly CognitiveToolCandidate[];
  readonly requiresApproval: boolean;
  readonly createdAt: string;
  readonly traceId: string;
  readonly rawOutput?: string;
}

export interface CognitiveTurn {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly timestamp?: string;
  readonly targetEntity?: string;
}

export interface CognitivePromptContext {
  readonly systemContext: string;
  readonly userContext: string;
  readonly memoryContext: string;
  readonly taskContext: string;
  readonly capabilitiesContext: string;
  readonly policyConstraints: string;
  readonly previousTurns?: readonly CognitiveTurn[];
}

export interface CognitiveProviderConfig {
  readonly providerPreference?: 'auto' | 'ollama' | 'local-real' | 'deterministic-fallback';
  readonly ollamaBaseUrl?: string;
  readonly ollamaModel?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

export interface CognitiveHealthStatus {
  readonly isAvailable: boolean;
  readonly providerType: CognitiveProviderType;
  readonly modelName: string;
  readonly latencyMs?: number;
  readonly error?: string;
  readonly details?: Record<string, unknown>;
}

export function makeCognitiveRequestId(): string {
  const rand = randomBytes(8).toString('hex');
  return `cogreq_${rand}`;
}

export function makeCognitiveTraceId(): string {
  const rand = randomBytes(8).toString('hex');
  return `cogtrc_${rand}`;
}

export function makeCognitivePlanId(): string {
  const rand = randomBytes(6).toString('hex');
  return `cogpln_${rand}`;
}
