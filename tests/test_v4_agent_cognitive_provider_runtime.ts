// tests/test_v4_agent_cognitive_provider_runtime.ts
// BOWCON V4.0 — Milestone 1.4.02: HYBRID LLM COGNITIVE PROVIDER RUNTIME REALITY GATE
//
// Comprehensive Reality Verification Suite covering:
// Vector 1: Provider Isolation
// Vector 2: Gemini Pure REST Boundary & Zero Tool Declarations
// Vector 3: Ollama Offline / Failure Handling & Zero Cost
// Vector 4: Deterministic Fallback Ladder & Circuit Breaker
// Vector 5: Hard Budget Governance & Cumulative Task Budget
// Vector 6: USER_STOP Absolute Supremacy (Pre-, In-flight, Fallback, Post-response)
// Vector 7: Security & Credential Redaction in Responses & Audit Records
// Vector 8: Structured Output & Schema Validation (No Silent Repair)
// Vector 9: SHA-256 Cryptographic Provenance
// Vector 10: Structured Audit Logging (Domain: agent_cognitive_runtime)
// Vector 11: Static Source Scan for Forbidden Primitives & Authority Leakage
// Vector 12: Decoupled Boundary (No Task Mutation, No Tool Execution, No PDP)

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  CognitiveProviderRuntime,
  GeminiCognitiveProvider,
  OllamaCognitiveProvider,
  DeterministicFallbackCognitiveProvider,
  CognitiveCircuitBreaker,
  CognitiveRuntimeError,
  CognitiveBudgetExceededError,
  CognitiveTimeoutError,
  CognitiveProviderUnavailableError,
  CognitiveValidationError,
  CognitiveUserStopError,
  type CognitiveInferenceRequest,
  type CognitiveInferenceResponse,
} from '../src/core/cognitive/index.js';
import { AuditLedger } from '../src/core/auditLedger.js';
import { AgentTaskRuntime, createTaskId } from '../src/core/taskLifecycle/index.js';

let passed = 0;
function ok(condition: boolean, msg: string): void {
  assert(condition, msg);
  passed++;
  console.log(`  [PASS ${passed.toString().padStart(2, '0')}] ${msg}`);
}

async function runRealityGate(): Promise<void> {
  console.log('\n================================================================================');
  console.log('  BOWCON V4.0 — MS-1.4.02: HYBRID LLM COGNITIVE PROVIDER RUNTIME REALITY GATE');
  console.log('================================================================================\n');

  const testDir = path.resolve(process.cwd(), 'data/test_agent_cognitive_' + Date.now());
  fs.mkdirSync(testDir, { recursive: true });
  const auditFile = path.resolve(testDir, 'audit_ledger.jsonl');
  const auditLedger = new AuditLedger(auditFile);

  const tenantAlpha = 'tenant_enterprise_alpha';
  const tenantBeta = 'tenant_retail_beta';
  const sampleTaskId = createTaskId(tenantAlpha);

  const sampleValidModelOutput = JSON.stringify({
    intent: 'ANALYZE',
    interpretation: 'Cluster node memory pressure detected in pod worker-03.',
    reasoningSummary: 'Heap memory exceeded 90% threshold; GC pause duration spiked to 1200ms.',
    plan: {
      steps: [
        {
          stepIndex: 0,
          action: 'ANALYZE_POD_METRICS',
          target: 'worker-03',
          parameters: { metric: 'memory_usage' },
          requiredCapability: 'sys:diagnostics',
          validationCriteria: 'POD_EXISTS',
        },
      ],
      summary: 'Collect diagnostic heap dump and inspect GC telemetry',
      estimatedRisk: 'LOW',
      requiredCapabilities: ['sys:diagnostics'],
    },
    decision: {
      decisionType: 'PROCEED',
      riskLevel: 'LOW',
      requiredCapabilities: ['sys:diagnostics'],
      requiresApproval: false,
      executionEligibility: true,
      reasonSummary: 'Diagnostic read-only operation requires no elevated privileges',
    },
    confidence: {
      score: 0.94,
      calibrationRationale: 'High confidence based on direct telemetry thresholds',
      meetsExecutionThreshold: true,
    },
    toolCandidates: [],
    requiresApproval: false,
  });

  try {
    // ------------------------------------------------------------------------
    // VECTOR 1: Provider Isolation
    // ------------------------------------------------------------------------
    console.log('--- Vector 1: Provider Isolation ---');

    const geminiMockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: sampleValidModelOutput }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 120,
            candidatesTokenCount: 80,
            totalTokenCount: 200,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const pGemini = new GeminiCognitiveProvider({ apiKey: 'mock-key-12345', fetchFn: geminiMockFetch });
    const pOllama = new OllamaCognitiveProvider({ baseUrl: 'http://127.0.0.1:11434' });
    const pFallback = new DeterministicFallbackCognitiveProvider();

    ok(pGemini.providerType === 'cloud-gemini', 'Gemini provider type is cloud-gemini');
    ok(pOllama.providerType === 'ollama-local', 'Ollama provider type is ollama-local');
    ok(pFallback.providerType === 'deterministic-fallback', 'Fallback provider type is deterministic-fallback');

    // Verify isolation: failure in one provider does not affect another
    const failingFetch: typeof fetch = async () => {
      throw new Error('Connection reset by peer');
    };
    const failingGemini = new GeminiCognitiveProvider({ apiKey: 'mock-key-fail', fetchFn: failingFetch });

    let geminiFailed = false;
    try {
      await failingGemini.executeInference({ taskContext: 'diagnostics' });
    } catch {
      geminiFailed = true;
    }
    ok(geminiFailed, 'Failing Gemini threw cleanly');

    // Deterministic fallback remains fully operational
    const fallbackRes = await pFallback.executeInference({ taskContext: 'diagnostics system status' });
    ok(fallbackRes.cognitiveResult.intent !== undefined, 'Fallback works independently of Gemini failure');
    ok(fallbackRes.cognitiveResult.model === 'bowcon-rule-engine-v4', 'Fallback honestly identifies rule engine model');

    // ------------------------------------------------------------------------
    // VECTOR 2: Gemini Pure REST Boundary & Zero Tool Declarations
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 2: Gemini Pure REST Boundary & Zero Tool Declarations ---');

    let capturedRequestUrl = '';
    let capturedRequestBody: any = null;
    let capturedRequestHeaders: any = null;

    const verifyingGeminiFetch: typeof fetch = async (input, init) => {
      capturedRequestUrl = String(input);
      capturedRequestHeaders = init?.headers;
      capturedRequestBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: sampleValidModelOutput }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 50,
            totalTokenCount: 200,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const strictGemini = new GeminiCognitiveProvider({
      apiKey: 'test-secret-api-key-xyz',
      fetchFn: verifyingGeminiFetch,
      modelName: 'gemini-1.5-pro',
    });

    const geminiResult = await strictGemini.executeInference({
      taskContext: 'Analyze cluster status',
      userContext: 'Investigate node failure',
    });

    ok(capturedRequestUrl.includes('generateContent'), 'Gemini uses pure REST generateContent API');
    ok(capturedRequestBody.contents !== undefined, 'Gemini request has contents structure');
    ok(capturedRequestBody.tools === undefined, 'Gemini request has ZERO tool declarations');
    ok(capturedRequestBody.toolConfig === undefined, 'Gemini request has ZERO toolConfig declarations');
    ok(
      capturedRequestBody.generationConfig?.responseMimeType === 'application/json',
      'Gemini requests application/json output mode'
    );
    ok(geminiResult.cognitiveResult.intent === 'ANALYZE', 'Gemini result parsed structured cognitive intent');
    ok(geminiResult.usage.promptTokens === 150, 'Gemini token usage: prompt tokens recorded');
    ok(geminiResult.usage.completionTokens === 50, 'Gemini token usage: completion tokens recorded');
    ok(geminiResult.usage.estimatedCostUsd > 0, 'Gemini usage computes positive estimated cost');

    // ------------------------------------------------------------------------
    // VECTOR 3: Ollama Offline / Failure Handling & Zero Cost
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 3: Ollama Offline / Failure Handling & Zero Cost ---');

    const offlineOllamaFetch: typeof fetch = async () => {
      const err = new TypeError('fetch failed: ECONNREFUSED 127.0.0.1:11434');
      throw err;
    };
    const offlineOllama = new OllamaCognitiveProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetchFn: offlineOllamaFetch,
    });

    let ollamaThrewUnavailable = false;
    try {
      await offlineOllama.executeInference({ taskContext: 'diagnose' });
    } catch (err) {
      if (err instanceof CognitiveProviderUnavailableError) {
        ollamaThrewUnavailable = true;
      }
    }
    ok(ollamaThrewUnavailable, 'Offline Ollama throws CognitiveProviderUnavailableError');

    // Online Ollama mock
    const onlineOllamaFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          response: sampleValidModelOutput,
          prompt_eval_count: 85,
          eval_count: 45,
          total_duration: 500000000,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };
    const onlineOllama = new OllamaCognitiveProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetchFn: onlineOllamaFetch,
    });

    const ollamaResult = await onlineOllama.executeInference({ taskContext: 'diagnose' });
    ok(ollamaResult.usage.estimatedCostUsd === 0, 'Ollama local inference cost is strictly $0.00');
    ok(ollamaResult.usage.promptTokens === 85, 'Ollama prompt tokens captured');
    ok(ollamaResult.usage.completionTokens === 45, 'Ollama completion tokens captured');
    ok(ollamaResult.cognitiveResult.confidence.score === 0.94, 'Ollama cognitive confidence parsed');

    // ------------------------------------------------------------------------
    // VECTOR 4: Deterministic Fallback Ladder & Circuit Breaker
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 4: Deterministic Fallback Ladder & Circuit Breaker ---');

    // Scenario A: Gemini fails -> Ollama succeeds
    const cb1 = new CognitiveCircuitBreaker({
      geminiProvider: failingGemini,
      ollamaProvider: onlineOllama,
      fallbackProvider: pFallback,
    });

    const route1 = await cb1.routeInference(
      { taskContext: 'check health' },
      { budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 } }
    );
    ok(route1.providerType === 'ollama-local', 'Fell back from Gemini to Ollama');
    ok(route1.fallbackOccurred === true, 'fallbackOccurred is true');
    ok(route1.fallbackChain.includes('cloud-gemini'), 'fallbackChain records cloud-gemini attempt');

    // Scenario B: Both Gemini and Ollama fail -> Fallback succeeds
    const cb2 = new CognitiveCircuitBreaker({
      geminiProvider: failingGemini,
      ollamaProvider: offlineOllama,
      fallbackProvider: pFallback,
    });

    const route2 = await cb2.routeInference(
      { taskContext: 'check health' },
      { budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 } }
    );
    ok(route2.providerType === 'deterministic-fallback', 'Fell back to deterministic fallback');
    ok(route2.fallbackChain.includes('cloud-gemini') && route2.fallbackChain.includes('ollama-local'),
      'fallbackChain records both cloud-gemini and ollama-local');

    // Scenario C: Circuit Breaker Trips to OPEN after 3 failures
    const cb3 = new CognitiveCircuitBreaker({
      failureThreshold: 3,
      cooldownMs: 30000,
      geminiProvider: failingGemini,
      ollamaProvider: onlineOllama,
      fallbackProvider: pFallback,
    });

    // Cause 3 failures on Gemini
    await cb3.routeInference({ taskContext: 'req1' }, { budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 } });
    await cb3.routeInference({ taskContext: 'req2' }, { budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 } });
    await cb3.routeInference({ taskContext: 'req3' }, { budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 } });

    const geminiState = cb3.getCircuitState('cloud-gemini');
    ok(geminiState.isOpen === true, 'Gemini circuit breaker is OPEN after 3 consecutive failures');
    ok(geminiState.consecutiveFailures >= 3, 'Consecutive failures count >= 3');

    // When circuit is OPEN, Gemini is skipped directly
    const route4 = await cb3.routeInference(
      { taskContext: 'req4' },
      { budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 } }
    );
    ok(route4.providerType === 'ollama-local', 'Skipped open circuit Gemini and called Ollama');
    ok(route4.fallbackChain.some(item => item.includes('circuit-open')), 'Fallback chain noted circuit-open state');

    // ------------------------------------------------------------------------
    // VECTOR 5: Hard Budget Governance & Cumulative Task Budget
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 5: Hard Budget Governance & Cumulative Task Budget ---');

    const runtime = new CognitiveProviderRuntime({
      geminiProvider: strictGemini,
      ollamaProvider: onlineOllama,
      fallbackProvider: pFallback,
      auditLedger,
      maxCumulativeTaskCostUsd: 0.10, // low budget for testing
    });

    // Test Prompt Token Breach
    const massivePrompt = 'A'.repeat(40000); // approx 10k tokens > 8192
    let promptBudgetExceeded = false;
    try {
      await runtime.executeInference({
        requestId: 'req-budget-01',
        tenantId: tenantAlpha,
        promptContext: { taskContext: massivePrompt },
        budget: {
          maxPromptTokens: 100, // strictly 100 tokens
          maxCompletionTokens: 2048,
          maxLatencyMs: 10000,
        },
      });
    } catch (err) {
      if (err instanceof CognitiveBudgetExceededError) {
        promptBudgetExceeded = true;
      }
    }
    ok(promptBudgetExceeded, 'Prompt token breach throws CognitiveBudgetExceededError');

    // Test Cumulative Task Cost Budget
    // Perform multiple inferences under sampleTaskId
    const regularReq: CognitiveInferenceRequest = {
      requestId: 'req-cumul-01',
      taskId: sampleTaskId,
      tenantId: tenantAlpha,
      promptContext: { taskContext: 'diagnostic query 1' },
      budget: {
        maxPromptTokens: 8192,
        maxCompletionTokens: 2048,
        maxLatencyMs: 10000,
      },
    };

    const resp1 = await runtime.executeInference(regularReq);
    ok(resp1.usage.estimatedCostUsd > 0, 'First inference recorded positive cost');
    ok(runtime.getTaskCumulativeCost(sampleTaskId) > 0, 'Task cumulative cost ledger tracks task cost');

    // Manually push task cost to breach limit
    (runtime as any).taskCostLedger.set(sampleTaskId, 0.15); // > 0.10 limit

    let taskBudgetExceeded = false;
    try {
      await runtime.executeInference({
        requestId: 'req-cumul-02',
        taskId: sampleTaskId,
        tenantId: tenantAlpha,
        promptContext: { taskContext: 'diagnostic query 2' },
        budget: {
          maxPromptTokens: 8192,
          maxCompletionTokens: 2048,
          maxLatencyMs: 10000,
        },
      });
    } catch (err) {
      if (err instanceof CognitiveBudgetExceededError) {
        taskBudgetExceeded = true;
      }
    }
    ok(taskBudgetExceeded, 'Cumulative task cost breach throws CognitiveBudgetExceededError');

    // ------------------------------------------------------------------------
    // VECTOR 6: USER_STOP Absolute Supremacy
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 6: USER_STOP Absolute Supremacy ---');

    let stopTriggered = false;
    const stopRuntime = new CognitiveProviderRuntime({
      geminiProvider: strictGemini,
      ollamaProvider: onlineOllama,
      fallbackProvider: pFallback,
      auditLedger,
      isUserStopActive: () => stopTriggered,
    });

    // Test 6A: USER_STOP active before request
    stopTriggered = true;
    let stopBeforeReq = false;
    try {
      await stopRuntime.executeInference({
        requestId: 'req-stop-01',
        tenantId: tenantAlpha,
        promptContext: { taskContext: 'run analysis' },
        budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 },
      });
    } catch (err) {
      if (err instanceof CognitiveUserStopError) {
        stopBeforeReq = true;
      }
    }
    ok(stopBeforeReq, 'USER_STOP before request throws CognitiveUserStopError immediately');

    // Test 6B: USER_STOP during in-flight Gemini execution
    stopTriggered = false;
    const slowGeminiFetch: typeof fetch = async (_input, init) => {
      const signal = init?.signal;
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: sampleValidModelOutput }] } }] }), { status: 200 }));
        }, 1000);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('This operation was aborted'));
        });
      });
    };

    const slowGemini = new GeminiCognitiveProvider({ apiKey: 'mock-key-slow-gemini', fetchFn: slowGeminiFetch });
    const inFlightStopRuntime = new CognitiveProviderRuntime({
      geminiProvider: slowGemini,
      ollamaProvider: onlineOllama,
      fallbackProvider: pFallback,
      auditLedger,
      isUserStopActive: () => stopTriggered,
    });

    const inFlightPromise = inFlightStopRuntime.executeInference({
      requestId: 'req-stop-02',
      tenantId: tenantAlpha,
      promptContext: { taskContext: 'run slow analysis' },
      budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 },
    });

    // Trigger stop mid-inference
    setTimeout(() => {
      stopTriggered = true;
      inFlightStopRuntime.setUserStop(true);
    }, 50);

    let stopDuringInFlight = false;
    try {
      await inFlightPromise;
    } catch (err) {
      if (err instanceof CognitiveUserStopError) {
        stopDuringInFlight = true;
      }
    }
    ok(stopDuringInFlight, 'USER_STOP during network execution aborts and throws CognitiveUserStopError');

    // ------------------------------------------------------------------------
    // VECTOR 7: Security & Credential Redaction
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 7: Security & Credential Redaction ---');

    stopTriggered = false;
    const secretApiKey = 'AIzaSyA_SECRET_KEY_SUPER_CONFIDENTIAL_12345';
    const secureGemini = new GeminiCognitiveProvider({
      apiKey: secretApiKey,
      fetchFn: verifyingGeminiFetch,
    });

    const secureRuntime = new CognitiveProviderRuntime({
      geminiProvider: secureGemini,
      ollamaProvider: onlineOllama,
      fallbackProvider: pFallback,
      auditLedger,
    });

    const secureResponse = await secureRuntime.executeInference({
      requestId: 'req-sec-01',
      tenantId: tenantAlpha,
      promptContext: { taskContext: 'status check with sensitive headers' },
      budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 },
    });

    const responseJson = JSON.stringify(secureResponse);
    ok(!responseJson.includes(secretApiKey), 'API key is NOT present anywhere in CognitiveInferenceResponse');
    ok(!responseJson.includes('AIzaSyA'), 'API key prefix is NOT present in response');

    // Verify audit log has zero credentials

    const auditContent = fs.readFileSync(auditFile, 'utf8');
    ok(!auditContent.includes(secretApiKey), 'API key is NOT present anywhere in audit ledger');
    ok(!auditContent.includes('mock-key-12345'), 'Mock keys are NOT present in audit ledger');

    // ------------------------------------------------------------------------
    // VECTOR 8: Schema Validation (No Silent Repair)
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 8: Schema Validation (No Silent Repair) ---');

    const malformedGeminiFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: '{"analysis": "looks good but missing intent and decision"}' }] },
              finishReason: 'STOP',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const malformedGemini = new GeminiCognitiveProvider({
      apiKey: 'k1',
      fetchFn: malformedGeminiFetch,
    });

    let schemaValidationFailed = false;
    try {
      await malformedGemini.executeInference({ taskContext: 'analyze' });
    } catch (err) {
      if (err instanceof CognitiveValidationError) {
        schemaValidationFailed = true;
      }
    }
    ok(schemaValidationFailed, 'Missing required cognitive fields throws CognitiveValidationError without silent repair');

    // ------------------------------------------------------------------------
    // VECTOR 9: SHA-256 Cryptographic Provenance
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 9: SHA-256 Cryptographic Provenance ---');

    const validResp = await secureRuntime.executeInference({
      requestId: 'req-prov-01',
      tenantId: tenantAlpha,
      promptContext: { taskContext: 'prov test' },
      budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 },
    });

    ok(/^[a-f0-9]{64}$/.test(validResp.provenanceHash), 'Provenance hash is valid 64-character hex SHA-256');

    // Verifying determinism: computing same provenance hash manually
    const resultFingerprint = secureRuntime.fingerprintResult(validResp.cognitiveResult);
    const expectedHash = secureRuntime.calculateProvenanceHash({
      requestId: validResp.requestId,
      tenantId: validResp.tenantId,
      providerType: validResp.providerType,
      modelName: validResp.modelName,
      timestamp: validResp.timestamp,
      resultFingerprint,
    });

    ok(validResp.provenanceHash === expectedHash, 'Provenance hash matches canonical SHA-256 computation');

    // ------------------------------------------------------------------------
    // VECTOR 10: Structured Audit Logging
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 10: Structured Audit Logging ---');


    const auditLines = fs
      .readFileSync(auditFile, 'utf8')
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));

    const cognitiveEvents = auditLines.filter(
      (e) => e.domain === 'agent_cognitive_runtime' || e.event?.domain === 'agent_cognitive_runtime'
    );
    ok(cognitiveEvents.length >= 4, 'Audit ledger recorded multiple agent_cognitive_runtime events');

    const completedEvents = cognitiveEvents.filter((e) =>
      (e.action === 'COGNITIVE_INFERENCE_COMPLETED') ||
      (e.event?.action === 'COGNITIVE_INFERENCE_COMPLETED')
    );
    ok(completedEvents.length >= 1, 'Found COGNITIVE_INFERENCE_COMPLETED audit event');

    const budgetEvents = cognitiveEvents.filter((e) =>
      (e.action === 'COGNITIVE_BUDGET_EXCEEDED') ||
      (e.event?.action === 'COGNITIVE_BUDGET_EXCEEDED')
    );
    ok(budgetEvents.length >= 1, 'Found COGNITIVE_BUDGET_EXCEEDED audit event');

    const stopEvents = cognitiveEvents.filter((e) =>
      (e.action === 'COGNITIVE_USER_STOP_ABORTED') ||
      (e.event?.action === 'COGNITIVE_USER_STOP_ABORTED')
    );
    ok(stopEvents.length >= 1, 'Found COGNITIVE_USER_STOP_ABORTED audit event');

    // ------------------------------------------------------------------------
    // VECTOR 11: Static Source Scan for Forbidden Primitives & Authority Leakage
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 11: Static Source Scan for Forbidden Primitives ---');

    const cognitiveSrcDir = path.resolve(process.cwd(), 'src/core/cognitive');
    const cognitiveFiles = fs.readdirSync(cognitiveSrcDir).filter((f) => f.endsWith('.ts'));

    const forbiddenPatterns = [
      /\bchild_process\b/,
      /\bexecSync\b/,
      /\bexec\s*\(/,
      /\bspawn\s*\(/,
      /\bfork\s*\(/,
      /\beval\s*\(/,
      /\bnew\s+Function\b/,
      /\bautoApprove\b/,
      /\bbypassPDP\b/,
      /\bbypassPEP\b/,
      /\bmutatePolicy\b/,
      /\bautonomousPhaseExit\b/,
      /\bautoRepair\b/,
    ];

    let forbiddenOccurrences = 0;
    for (const file of cognitiveFiles) {
      const fullPath = path.join(cognitiveSrcDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          console.error(`❌ FORBIDDEN PATTERN ${pattern} found in ${file}`);
          forbiddenOccurrences++;
        }
      }
    }
    ok(forbiddenOccurrences === 0, 'Zero forbidden primitives or authority leakage patterns in src/core/cognitive/');

    // ------------------------------------------------------------------------
    // VECTOR 12: Decoupled Boundary (No Task Mutation, No Tool Execution, No PDP)
    // ------------------------------------------------------------------------
    console.log('\n--- Vector 12: Decoupled Boundary ---');

    // Initialize an AgentTask
    const taskRuntime = new AgentTaskRuntime({
      baseDir: testDir,
      auditLedger,
    });

    const createdTask = await taskRuntime.createTask({
      tenantId: tenantBeta,
      userId: 'analyst-42',
      title: 'Analyze Telemetry',
      intent: 'ANALYZE',
      sessionContext: { description: 'Analyze telemetry' },
      executionBudget: { maxSteps: 10, maxDurationMs: 60000, maxRetries: 3 },
    });

    ok(createdTask.state === 'SUBMITTED', 'Task initialized in SUBMITTED state');

    // Invoke cognitive runtime referencing this task
    const cognitiveResp = await secureRuntime.executeInference({
      requestId: 'req-bound-01',
      taskId: createdTask.taskId,
      tenantId: tenantBeta,
      promptContext: {
        taskContext: 'Compute diagnostic plan',
      },
      budget: { maxPromptTokens: 8192, maxCompletionTokens: 2048, maxLatencyMs: 10000 },
    });

    ok(cognitiveResp.cognitiveResult !== undefined, 'Inference executed successfully');

    // Re-read task from store: verify that task state and version have NOT mutated
    const fetchedTask = taskRuntime.getTask(tenantBeta, createdTask.taskId);
    ok(fetchedTask.state === 'SUBMITTED', 'Task state remained SUBMITTED (NOT mutated by cognitive runtime)');
    ok(fetchedTask.version === 1, 'Task version remained 1 (no state transitions occurred)');
    ok(fetchedTask.updatedAt === createdTask.updatedAt, 'Task updatedAt remained unchanged (no mutation)');
    ok(fetchedTask.provenanceHash === createdTask.provenanceHash, 'Task provenanceHash remained unchanged');

    console.log('\n================================================================================');
    console.log(`  REALITY GATE COMPLETE: ${passed} / ${passed} assertions PASSED`);
    console.log('================================================================================\n');
  } finally {
    // Cleanup temporary test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

runRealityGate().catch((err) => {
  console.error('Reality gate failed with unhandled error:', err);
  process.exit(1);
});
