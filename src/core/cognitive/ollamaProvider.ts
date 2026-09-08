// src/core/cognitive/ollamaProvider.ts
// BOWCON V4.0 — MS-1.3.32: REAL OLLAMA LOCAL COGNITIVE PROVIDER
//
// Invariants:
// GENUINE_HTTP == TRUE (No fake in-memory adapter)
// HONEST_REPORTING == TRUE (Never pretend offline is online)
// LLM_PROPOSE != EXECUTE

import { PromptBuilder } from './promptBuilder.js';
import {
  CognitiveError,
  classifyCognitiveError,
} from './cognitiveFailure.js';
import type {
  CognitiveProviderType,
  CognitivePromptContext,
  CognitiveResult,
  CognitiveHealthStatus,
  CognitiveIntent,
  CognitiveRiskLevel,
  CognitiveDecisionType,
  CognitivePlan,
  CognitiveDecision,
  CognitiveConfidence,
  CognitiveToolCandidate,
  CognitiveStageTrace,
} from './cognitiveTypes.js';
import {
  makeCognitiveRequestId,
  makeCognitiveTraceId,
  makeCognitivePlanId,
} from './cognitiveTypes.js';
import type {
  CognitiveProvider,
  CognitiveExecutionOptions,
} from './cognitiveProvider.js';

export class OllamaProvider implements CognitiveProvider {
  public readonly providerType: CognitiveProviderType = 'ollama';
  public readonly providerName = 'ollama-local';
  public readonly baseUrl: string;
  public readonly modelName: string;
  public readonly defaultTimeoutMs: number;

  constructor(options?: {
    baseUrl?: string;
    model?: string;
    timeoutMs?: number;
  }) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.BRAIN_OLLAMA_BASE_URL ||
      'http://127.0.0.1:11434'
    ).replace(/\/+$/, '');

    this.modelName =
      options?.model ||
      process.env.BRAIN_OLLAMA_MODEL ||
      'qwen2.5:7b';

    this.defaultTimeoutMs =
      options?.timeoutMs ||
      Number(process.env.BRAIN_OLLAMA_TIMEOUT_MS) ||
      3000;
  }

  /**
   * Genuine health probe hitting /api/tags
   */
  public async healthCheck(): Promise<CognitiveHealthStatus> {
    const started = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - started;
      if (!res.ok) {
        return {
          isAvailable: false,
          providerType: this.providerType,
          modelName: this.modelName,
          latencyMs,
          error: `Ollama returned HTTP ${res.status} ${res.statusText}`,
        };
      }

      const body = (await res.json()) as { models?: Array<{ name: string }> };
      const modelList = body.models?.map((m) => m.name) || [];
      const hasModel = modelList.some(
        (m) => m === this.modelName || m.startsWith(this.modelName.split(':')[0])
      );

      return {
        isAvailable: true,
        providerType: this.providerType,
        modelName: this.modelName,
        latencyMs,
        details: {
          installedModels: modelList,
          modelFound: hasModel,
        },
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - started;
      const code = classifyCognitiveError(err);
      return {
        isAvailable: false,
        providerType: this.providerType,
        modelName: this.modelName,
        latencyMs,
        error: `[${code}] Ollama daemon unreachable at ${this.baseUrl}`,
      };
    }
  }

  /**
   * Executes genuine HTTP request against Ollama /api/generate
   */
  public async process(
    context: CognitivePromptContext,
    options?: CognitiveExecutionOptions
  ): Promise<CognitiveResult> {
    const startedAt = Date.now();
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const stages: CognitiveStageTrace[] = [];

    const promptStart = Date.now();
    const formattedPrompt = PromptBuilder.buildStructuredPrompt(context);
    stages.push({
      stage: 'prompt_construction',
      startedAt: promptStart,
      completedAt: Date.now(),
      durationMs: Date.now() - promptStart,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // If external signal provided, listen to it
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    let rawResponse: string;
    let promptEvalCount: number | undefined;
    let evalCount: number | undefined;

    const netStart = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: formattedPrompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1, // Deterministic adherence
            num_predict: options?.maxTokens || 1024,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      stages.push({
        stage: 'provider_http_call',
        startedAt: netStart,
        completedAt: Date.now(),
        durationMs: Date.now() - netStart,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new CognitiveError(
            'PROVIDER_AUTH_FAILURE',
            `Ollama auth failure: HTTP ${res.status}`,
            { providerType: this.providerType }
          );
        }
        if (res.status === 429) {
          throw new CognitiveError(
            'PROVIDER_RATE_LIMITED',
            `Ollama rate limited: HTTP 429`,
            { providerType: this.providerType }
          );
        }
        throw new CognitiveError(
          'PROVIDER_INVALID_RESPONSE',
          `Ollama returned error: HTTP ${res.status}`,
          { providerType: this.providerType }
        );
      }

      const json = (await res.json()) as {
        response?: string;
        prompt_eval_count?: number;
        eval_count?: number;
      };

      rawResponse = json.response || '';
      promptEvalCount = json.prompt_eval_count;
      evalCount = json.eval_count;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof CognitiveError) throw err;

      const code = classifyCognitiveError(err);
      throw new CognitiveError(
        code,
        `Ollama request failed: ${err instanceof Error ? err.message : String(err)}`,
        { providerType: this.providerType, cause: err }
      );
    }

    // Parse structured JSON response
    const parseStart = Date.now();
    let parsedData: any;
    try {
      const cleaned = rawResponse
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();
      parsedData = JSON.parse(cleaned);
    } catch (parseErr) {
      stages.push({
        stage: 'response_parsing_failed',
        startedAt: parseStart,
        completedAt: Date.now(),
        durationMs: Date.now() - parseStart,
      });
      throw new CognitiveError(
        'PROVIDER_MALFORMED_OUTPUT',
        `Failed to parse JSON response from Ollama: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        { providerType: this.providerType, cause: parseErr }
      );
    }

    stages.push({
      stage: 'response_parsing',
      startedAt: parseStart,
      completedAt: Date.now(),
      durationMs: Date.now() - parseStart,
    });

    const validatedResult = this.normalizeCognitiveOutput(
      parsedData,
      context,
      rawResponse,
      stages,
      startedAt,
      promptEvalCount,
      evalCount
    );

    return validatedResult;
  }

  /**
   * Safe normalization ensuring all contract invariants are satisfied.
   */
  private normalizeCognitiveOutput(
    raw: any,
    _context: CognitivePromptContext,
    rawText: string,
    stages: CognitiveStageTrace[],
    startedAt: number,
    promptTokens?: number,
    completionTokens?: number
  ): CognitiveResult {
    const requestId = makeCognitiveRequestId();
    const traceId = makeCognitiveTraceId();
    const planId = makeCognitivePlanId();

    const intent: CognitiveIntent = (
      typeof raw.intent === 'string' ? raw.intent.toUpperCase() : 'UNKNOWN'
    ) as CognitiveIntent;

    const interpretation =
      typeof raw.interpretation === 'string'
        ? PromptBuilder.sanitizeText(raw.interpretation)
        : 'Interpreted model proposal.';

    const reasoningSummary =
      typeof raw.reasoningSummary === 'string'
        ? PromptBuilder.sanitizeText(raw.reasoningSummary)
        : 'High-level reasoning proposal.';

    // Plan steps
    const rawSteps = Array.isArray(raw.plan?.steps) ? raw.plan.steps : [];
    const steps = rawSteps.map((s: any, idx: number) => ({
      stepIndex: typeof s.stepIndex === 'number' ? s.stepIndex : idx + 1,
      action: typeof s.action === 'string' ? s.action : 'propose_action',
      target: typeof s.target === 'string' ? s.target : undefined,
      parameters: typeof s.parameters === 'object' && s.parameters !== null ? s.parameters : {},
      requiredCapability: typeof s.requiredCapability === 'string' ? s.requiredCapability : 'fs:read',
      validationCriteria: typeof s.validationCriteria === 'string' ? s.validationCriteria : undefined,
    }));

    const estimatedRisk: CognitiveRiskLevel = (
      typeof raw.plan?.estimatedRisk === 'string'
        ? raw.plan.estimatedRisk.toUpperCase()
        : 'LOW'
    ) as CognitiveRiskLevel;

    const plan: CognitivePlan = {
      planId,
      steps,
      summary: typeof raw.plan?.summary === 'string' ? raw.plan.summary : 'Proposed cognitive plan.',
      estimatedRisk,
      requiredCapabilities: Array.isArray(raw.plan?.requiredCapabilities)
        ? raw.plan.requiredCapabilities
        : ['fs:read'],
    };

    // Decision
    const decisionType: CognitiveDecisionType = (
      typeof raw.decision?.decisionType === 'string'
        ? raw.decision.decisionType.toUpperCase()
        : 'PROCEED'
    ) as CognitiveDecisionType;

    const riskLevel: CognitiveRiskLevel = (
      typeof raw.decision?.riskLevel === 'string'
        ? raw.decision.riskLevel.toUpperCase()
        : estimatedRisk
    ) as CognitiveRiskLevel;

    const decision: CognitiveDecision = {
      decisionType,
      riskLevel,
      requiredCapabilities: Array.isArray(raw.decision?.requiredCapabilities)
        ? raw.decision.requiredCapabilities
        : plan.requiredCapabilities,
      requiresApproval: Boolean(raw.decision?.requiresApproval || riskLevel === 'HIGH' || riskLevel === 'CRITICAL'),
      executionEligibility: Boolean(raw.decision?.executionEligibility ?? true),
      reasonSummary: typeof raw.decision?.reasonSummary === 'string' ? raw.decision.reasonSummary : 'Model decision proposal.',
    };

    // Confidence
    const rawScore = typeof raw.confidence?.score === 'number' ? raw.confidence.score : 0.85;
    const confidence: CognitiveConfidence = {
      score: Math.max(0.0, Math.min(1.0, rawScore)),
      calibrationRationale: typeof raw.confidence?.calibrationRationale === 'string' ? raw.confidence.calibrationRationale : 'Model confidence estimate.',
      meetsExecutionThreshold: rawScore >= 0.7,
    };

    // Tool candidates
    const rawCandidates = Array.isArray(raw.toolCandidates) ? raw.toolCandidates : [];
    const toolCandidates: CognitiveToolCandidate[] = rawCandidates.map((c: any) => ({
      toolName: typeof c.toolName === 'string' ? c.toolName : 'brain_echo',
      toolArgs: typeof c.toolArgs === 'object' && c.toolArgs !== null ? c.toolArgs : {},
      intent: (typeof c.intent === 'string' ? c.intent.toUpperCase() : intent) as CognitiveIntent,
      capability: typeof c.capability === 'string' ? c.capability : 'fs:read',
    }));

    return {
      requestId,
      provider: this.providerType,
      model: this.modelName,
      intent,
      interpretation,
      reasoningSummary,
      plan,
      decision,
      confidence,
      requestedCapabilities: decision.requiredCapabilities,
      riskLevel,
      toolCandidates,
      requiresApproval: decision.requiresApproval,
      createdAt: new Date().toISOString(),
      traceId,
      rawOutput: PromptBuilder.sanitizeText(rawText),
    };
  }

  public async summarize(taskSummary: Record<string, unknown>): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const prompt = `Summarize this task completion safely in one concise sentence: ${JSON.stringify(taskSummary)}`;
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return `Task completed: ${taskSummary.taskId ?? 'unknown'} with status ${taskSummary.success ? 'SUCCESS' : 'FAILED'}.`;
      }
      const json = (await res.json()) as { response?: string };
      return json.response?.trim() || `Task completed: ${taskSummary.taskId ?? 'unknown'}.`;
    } catch {
      clearTimeout(timeoutId);
      return `Task completed: ${taskSummary.taskId ?? 'unknown'} with status ${taskSummary.success ? 'SUCCESS' : 'FAILED'}.`;
    }
  }

  public async shutdown(): Promise<void> {
    // Stateless HTTP provider, nothing to drain
  }
}
