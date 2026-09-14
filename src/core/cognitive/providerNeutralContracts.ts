// src/core/cognitive/providerNeutralContracts.ts
// BOWCON V4.0 — MS-1.5.01: PROVIDER-NEUTRAL COGNITIVE CONTRACTS & PROPOSAL INTERFACES
// Component 981 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// LLM_OUTPUT != EXECUTABLE_COMMAND
// MODEL_CONFIDENCE != TRUTH
// PROPOSAL != AUTHORIZATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_MALFORMED_OUTPUT == TRUE
// SANITIZED_CLOUD_ESCALATION == TRUE

import { randomBytes, createHash } from 'node:crypto';
import type {
  CognitiveIntent,
  CognitiveRiskLevel,
  CognitiveDecisionType,
} from './cognitiveTypes.js';

export const PROVIDER_NEUTRAL_CONTRACT_VERSION = '1.5.01';

/**
 * Supported provider tiers in the inverted local-first architecture.
 */
export type CognitiveRuntimeTier = 'local-slm' | 'cloud-escalation' | 'deterministic-fallback';

/**
 * Model classification indicating privacy sensitivity.
 */
export type ModelPrivacyLevel = 'AIR_GAPPED_LOCAL' | 'PRIVATE_LOCAL_NETWORK' | 'EXTERNAL_CLOUD';

/**
 * Failure category classification for cognitive operations.
 */
export type CognitiveFailureReason =
  | 'TIMEOUT'
  | 'CONNECTION_REFUSED'
  | 'MODEL_NOT_FOUND'
  | 'CIRCUIT_OPEN'
  | 'MALFORMED_JSON'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'CAPABILITY_UNSUPPORTED'
  | 'BUDGET_EXCEEDED'
  | 'USER_STOP_PREEMPTED'
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

/**
 * Provider-neutral representation of a candidate tool action.
 * THIS IS A PROPOSAL DATA STRUCTURE — IT CANNOT EXECUTE ON ITS OWN.
 */
export interface CognitiveToolProposal {
  readonly toolName: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly rationale: string;
  readonly requiredCapability: string;
  readonly estimatedRisk: CognitiveRiskLevel;
}

/**
 * Provider-neutral representation of an action proposal produced by cognitive reasoning.
 * Under no circumstances does this structure confer execution authority.
 */
export interface CognitiveActionProposal {
  readonly proposalId: string;
  readonly sourceTier: CognitiveRuntimeTier;
  readonly providerName: string;
  readonly modelName: string;
  readonly intent: CognitiveIntent;
  readonly interpretation: string;
  readonly reasoningChain: readonly string[];
  readonly toolProposals: readonly CognitiveToolProposal[];
  readonly decision: {
    readonly decisionType: CognitiveDecisionType;
    readonly riskLevel: CognitiveRiskLevel;
    readonly requiresApproval: boolean;
    readonly executionEligibility: boolean;
    readonly reasoning: string;
  };
  readonly confidence: {
    readonly score: number; // 0.0 to 1.0
    readonly meetsThreshold: boolean;
    readonly calibrationNote: string;
  };
  readonly rawTextOutput?: string;
  readonly provenanceHash: string;
  readonly createdAt: string;
}

/**
 * Model capabilities metadata in the registry.
 */
export interface ModelCapabilities {
  readonly modelId: string;
  readonly providerType: 'ollama' | 'gemini' | 'deterministic';
  readonly privacyLevel: ModelPrivacyLevel;
  readonly isLocal: boolean;
  readonly contextWindow: number; // Maximum tokens
  readonly supportsStructuredJson: boolean;
  readonly supportsToolCalling: boolean;
  readonly supportsVision: boolean;
  readonly averageLatencyMs: number;
  readonly estimatedCostPer1MTokensUsd: number;
  readonly family?: string;
  readonly parameterSize?: string;
  readonly quantization?: string;
}

/**
 * Detailed error reporting for cognitive failures.
 */
export interface CognitiveFailureDetail {
  readonly reason: CognitiveFailureReason;
  readonly tier: CognitiveRuntimeTier;
  readonly providerName: string;
  readonly modelName: string;
  readonly message: string;
  readonly timestamp: number;
  readonly isRecoverable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Configuration for cloud escalation policy.
 */
export interface CloudEscalationPolicy {
  readonly enabled: boolean;
  readonly allowDataEgress: boolean;
  readonly maxLatencyMs: number;
  readonly maxEscalationCostUsd: number;
  readonly disallowedKeywords: readonly string[];
  readonly stripEnvironmentVariables: boolean;
  readonly stripFilePaths: boolean;
}

/**
 * Provider health report.
 */
export interface CognitiveProviderHealthReport {
  readonly providerName: string;
  readonly tier: CognitiveRuntimeTier;
  readonly isHealthy: boolean;
  readonly activeModel: string;
  readonly availableModels: readonly string[];
  readonly latencyMs: number;
  readonly checkedAt: string;
  readonly lastError?: string;
}

/**
 * Generates a deterministic SHA-256 hash for proposal provenance.
 */
export function computeProposalProvenanceHash(payload: {
  readonly proposalId: string;
  readonly providerName: string;
  readonly modelName: string;
  readonly intent: string;
  readonly createdAt: string;
}): string {
  const serialized = `${payload.proposalId}:${payload.providerName}:${payload.modelName}:${payload.intent}:${payload.createdAt}`;
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Generates a unique proposal identifier.
 */
export function makeProposalId(): string {
  return `cogprop_${randomBytes(8).toString('hex')}`;
}
