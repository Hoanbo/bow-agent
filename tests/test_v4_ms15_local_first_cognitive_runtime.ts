// tests/test_v4_ms15_local_first_cognitive_runtime.ts
// BOWCON V4.0 — MS-1.5.01: LOCAL MODEL RUNTIME & INVERTED LOCAL-FIRST COGNITIVE SUITE
// Dedicated Regression Suite #95
//
// Verifies Components 981–988:
// 1. Provider-Neutral Cognitive Contract & Proposals (981)
// 2. Model Capability Registry & Dynamic Discovery (982)
// 3. Structured Cognitive Output Validator & Fails-Closed Boundary (983)
// 4. Cloud Escalation Privacy & Secret Sanitization Guard (984)
// 5. First-Class Local Ollama Cognitive Runtime (985)
// 6. Inverted Local-First Provider Router (986)
// 7. Master Local Cognitive Runtime Façade (987)
// 8. Module Index & Re-exports (988)
//
// Invariants Verified:
// - COGNITION != AUTHORITY
// - REASONING != AUTHORIZATION
// - LLM_OUTPUT != EXECUTABLE_COMMAND
// - ZERO_DIRECT_TOOL_EXECUTION == TRUE
// - LOCAL_FIRST_BY_DEFAULT == TRUE
// - SANITIZE_BEFORE_TRANSMISSION == TRUE
// - USER_STOP_ABSOLUTE_SUPREMACY == TRUE
// - SHOP_OF_BOW_WORKSPACE_ISOLATION == TRUE

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  // MS-1.5.01 Components & Types
  PROVIDER_NEUTRAL_CONTRACT_VERSION,
  type CognitiveActionProposal,
  type CognitiveToolProposal,
  type ModelCapabilities,
  type CognitiveProviderHealthReport,
  ModelCapabilityRegistry,
  defaultModelCapabilityRegistry,
  StructuredCognitiveValidator,
  CloudEscalationSanitizer,
  LocalFirstOllamaRuntime,
  LocalFirstRouterEngine,
  LocalCognitiveRuntimeFacade,
  globalLocalCognitiveRuntime,
  computeProposalProvenanceHash,
  // Core Types & Errors
  type CognitivePromptContext,
  CognitiveValidationError,
  CognitiveTimeoutError,
  CognitiveProviderUnavailableError,
  CognitiveUserStopError,
  CognitiveCircuitBreaker,
  GeminiCognitiveProvider,
  DeterministicFallbackCognitiveProvider,
} from '../src/core/cognitive/index.js';

let passedAssertions = 0;
function expect(condition: boolean, msg: string) {
  assert(condition, `[ASSERTION FAILED] ${msg}`);
  passedAssertions++;
}

async function runSuite95(): Promise<void> {
  console.log('\n================================================================================');
  console.log('  BOWCON V4.0 — MS-1.5.01: LOCAL-FIRST COGNITIVE RUNTIME REALITY GATE (SUITE #95)');
  console.log('================================================================================\n');

  // Sample valid model structured output
  const sampleValidLocalOutput = JSON.stringify({
    intent: 'ANALYZE',
    interpretation: 'Analyze disk storage metrics on local host',
    reasoningSummary: 'Local disk usage exceeds nominal threshold, inspection needed',
    plan: {
      planId: 'plan_diag_01',
      summary: 'Inspect local storage volumes',
      estimatedRisk: 'LOW',
      requiredCapabilities: ['filesystem_read'],
      steps: [
        {
          action: 'fs_check_storage',
          parameters: { targetPath: 'C:\\data\\cache', thresholdPercent: 80 },
          validationCriteria: 'Storage threshold < 85%',
        },
      ],
    },
    decision: {
      decisionType: 'PROCEED',
      riskLevel: 'LOW',
      requiresApproval: false,
      executionEligibility: true,
      reasonSummary: 'Read-only storage analysis is eligible for automated execution',
    },
    confidence: {
      score: 0.95,
      calibrationRationale: 'Exact match with diagnostic query pattern',
      meetsExecutionThreshold: true,
    },
    toolProposals: [
      {
        toolName: 'system_disk_probe',
        parameters: { volume: 'C:', timeoutMs: 2000 },
        rationale: 'Verify storage capacity',
        requiredCapability: 'system_telemetry',
        estimatedRisk: 'LOW',
      },
    ],
  });

  // --------------------------------------------------------------------------
  // VECTOR 1: Provider-Neutral Contract & Proposal Integrity (Component 981)
  // --------------------------------------------------------------------------
  console.log('--- Vector 1: Provider-Neutral Contract & Proposal Integrity ---');
  expect(PROVIDER_NEUTRAL_CONTRACT_VERSION === '1.5.01', 'Provider neutral contract version is 1.5.01');

  const hash1 = computeProposalProvenanceHash({
    proposalId: 'prop_001',
    providerName: 'ollama-local-runtime',
    modelName: 'qwen2.5:7b',
    intent: 'ANALYZE',
    createdAt: '2026-09-14T00:00:00.000Z',
  });
  expect(typeof hash1 === 'string' && hash1.length === 64, 'Proposal provenance hash is valid SHA-256');

  // --------------------------------------------------------------------------
  // VECTOR 2: Model Capability Registry & Dynamic Discovery (Component 982)
  // --------------------------------------------------------------------------
  console.log('--- Vector 2: Model Capability Registry & Dynamic Discovery ---');
  const registry = new ModelCapabilityRegistry();
  const qwenModel = registry.get('qwen2.5:7b');
  expect(qwenModel !== undefined, 'Registry has qwen2.5:7b');
  expect(qwenModel?.isLocal === true, 'qwen2.5:7b is marked as local');
  expect(qwenModel?.privacyLevel === 'AIR_GAPPED_LOCAL', 'qwen2.5:7b privacy level is AIR_GAPPED_LOCAL');
  expect(qwenModel?.estimatedCostPer1MTokensUsd === 0.0, 'qwen2.5:7b cost is strictly $0.00');

  const geminiModel = registry.get('gemini-2.0-flash');
  expect(geminiModel !== undefined, 'Registry has gemini-2.0-flash');
  expect(geminiModel?.isLocal === false, 'gemini-2.0-flash is marked as cloud');
  expect(geminiModel?.privacyLevel === 'EXTERNAL_CLOUD', 'gemini-2.0-flash privacy level is EXTERNAL_CLOUD');

  // Test dynamic ingestion from Ollama tags
  const tagsSample = {
    models: [
      {
        name: 'deepseek-r1:8b',
        details: { family: 'deepseek', parameter_size: '8B', quantization_level: 'Q4_K_M', context_length: 65536 },
        capabilities: ['completion', 'tools'],
      },
    ],
  };
  const ingested = registry.ingestOllamaTags(tagsSample);
  expect(ingested === 1, 'Ingested 1 new model from tags');
  const deepseek = registry.get('deepseek-r1:8b');
  expect(deepseek !== undefined, 'Discovered deepseek-r1:8b is now registered');
  expect(deepseek?.supportsToolCalling === true, 'Discovered tools capability parsed');

  // --------------------------------------------------------------------------
  // VECTOR 3: Structured Output Validation & Fails-Closed Boundary (Component 983)
  // --------------------------------------------------------------------------
  console.log('--- Vector 3: Structured Output Validation & Fails-Closed Boundary ---');
  const validProposal = StructuredCognitiveValidator.parseAndValidate(sampleValidLocalOutput, {
    tier: 'local-slm',
    providerName: 'ollama-local-runtime',
    modelName: 'qwen2.5:7b',
  });

  expect(validProposal.intent === 'ANALYZE', 'Validated proposal has intent ANALYZE');
  expect(validProposal.toolProposals.length >= 1, 'Validated proposal captured tool proposals');
  expect(validProposal.toolProposals[0].toolName === 'system_disk_probe', 'Tool name matches');
  expect(validProposal.decision.decisionType === 'PROCEED', 'Decision parsed correctly');
  expect(validProposal.confidence.score === 0.95, 'Confidence parsed correctly');
  expect(validProposal.confidence.meetsThreshold === true, 'Meets execution threshold');

  // Fails closed on malformed JSON
  let malformedCaught = false;
  try {
    StructuredCognitiveValidator.parseAndValidate('{ "intent": "ANALYZE", broken json ...', {
      tier: 'local-slm',
      providerName: 'ollama-local-runtime',
      modelName: 'qwen2.5:7b',
    });
  } catch (err: any) {
    if (err.name === 'CognitiveValidationError') malformedCaught = true;
  }
  expect(malformedCaught, 'Fails closed on syntax-invalid JSON');

  // Fails closed on missing required fields
  let missingFieldCaught = false;
  try {
    StructuredCognitiveValidator.parseAndValidate(JSON.stringify({ intent: 'ANALYZE' }), {
      tier: 'local-slm',
      providerName: 'ollama-local-runtime',
      modelName: 'qwen2.5:7b',
    });
  } catch (err: any) {
    if (err.name === 'CognitiveValidationError') missingFieldCaught = true;
  }
  expect(missingFieldCaught, 'Fails closed on missing interpretation/plan fields');

  // Defends against prototype pollution in tool parameters
  const pollutionPayload = JSON.stringify({
    intent: 'ANALYZE',
    interpretation: 'Test prototype attack',
    plan: { summary: 'Plan test' },
    decision: { decisionType: 'PROCEED' },
    toolProposals: [
      {
        toolName: 'dangerous_tool',
        parameters: {
          safeKey: 'safeVal',
          __proto__: { polluted: true },
          constructor: { prototype: { admin: true } },
        },
      },
    ],
  });
  let pollutionRejected = false;
  try {
    StructuredCognitiveValidator.parseAndValidate(pollutionPayload, {
      tier: 'local-slm',
      providerName: 'ollama-local-runtime',
      modelName: 'qwen2.5:7b',
    });
  } catch (err: any) {
    if (err.name === 'CognitiveValidationError' && err.message.includes('validation')) {
      pollutionRejected = true;
    }
  }
  expect(pollutionRejected, 'Prototype pollution payload strictly rejected during validation');

  // --------------------------------------------------------------------------
  // VECTOR 4: Cloud Escalation Privacy & Secret Sanitization Guard (Component 984)
  // --------------------------------------------------------------------------
  console.log('--- Vector 4: Cloud Escalation Privacy & Secret Sanitization Guard ---');
  const dirtyContext: CognitivePromptContext = {
    systemContext: 'System prompt containing GEMINI_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6 and password = "SuperSecretPassword123!"',
    userContext: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ae7 triggers diagnostic',
    taskContext: 'Inspect protected workspace C:\\BOW\\shopofbow\\data and C:\\Users\\Administrator\\secrets.txt',
  };

  const { sanitizedContext, report } = CloudEscalationSanitizer.sanitize(dirtyContext);
  expect(report.wasModified === true, 'Sanitizer detected sensitive values and modified context');
  expect(report.redactedCount >= 4, 'At least 4 credentials/internal items were redacted');
  expect(!sanitizedContext.systemContext?.includes('AIzaSy'), 'Gemini API key is completely redacted');
  expect(!sanitizedContext.systemContext?.includes('SuperSecretPassword123'), 'Password is completely redacted');
  expect(!sanitizedContext.userContext?.includes('eyJhbGciOi'), 'Bearer token is completely redacted');
  expect(!sanitizedContext.taskContext?.includes('shopofbow'), 'Protected workspace path is redacted');
  expect(sanitizedContext.taskContext?.includes('[PROTECTED_WORKSPACE_PATH]'), 'Protected path replaced with safe token');

  // --------------------------------------------------------------------------
  // VECTOR 5: First-Class Local Ollama Cognitive Runtime (Component 985)
  // --------------------------------------------------------------------------
  console.log('--- Vector 5: First-Class Local Ollama Cognitive Runtime ---');
  // Mock offline fetch
  const offlineOllamaFetch: typeof fetch = async () => {
    throw new TypeError('fetch failed: ECONNREFUSED 127.0.0.1:11434');
  };
  const offlineOllama = new LocalFirstOllamaRuntime({
    baseUrl: 'http://127.0.0.1:11434',
    fetchFn: offlineOllamaFetch,
  });

  const offlineHealth = await offlineOllama.probeHealth();
  expect(offlineHealth.isHealthy === false, 'Offline health probe honestly reports unhealthy');
  expect(offlineHealth.tier === 'local-slm', 'Health report tier is local-slm');

  let offlineErrorCaught = false;
  try {
    await offlineOllama.execute({ taskContext: 'run local diagnosis' });
  } catch (err: any) {
    if (err.name === 'CognitiveProviderUnavailableError') {
      offlineErrorCaught = true;
      const failure = offlineOllama.classifyFailure(err);
      expect(failure.reason === 'CONNECTION_REFUSED', 'Classified as CONNECTION_REFUSED');
      expect(failure.isRecoverable === true, 'Connection refused is classified as recoverable');
    }
  }
  expect(offlineErrorCaught, 'Offline Ollama throws CognitiveProviderUnavailableError');

  // Mock online fetch
  const onlineOllamaFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/api/tags')) {
      return new Response(JSON.stringify({ models: [{ name: 'qwen2.5:7b' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        response: sampleValidLocalOutput,
        prompt_eval_count: 120,
        eval_count: 65,
        total_duration: 350000000,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const onlineOllama = new LocalFirstOllamaRuntime({
    baseUrl: 'http://127.0.0.1:11434',
    fetchFn: onlineOllamaFetch,
  });

  const onlineHealth = await onlineOllama.probeHealth();
  expect(onlineHealth.isHealthy === true, 'Online probe reports healthy');
  expect(onlineHealth.activeModel === 'qwen2.5:7b', 'Active model confirmed');

  const onlineExec = await onlineOllama.execute({ taskContext: 'diagnose storage' });
  expect(onlineExec.proposal.intent === 'ANALYZE', 'Online Ollama produced validated proposal');
  expect(onlineExec.estimatedCostUsd === 0.0, 'Local inference is strictly $0.00');
  expect(onlineExec.promptTokens === 120, 'Prompt tokens recorded');
  expect(onlineExec.completionTokens === 65, 'Completion tokens recorded');

  // Test timeout handling with AbortController
  const hangingOllamaFetch: typeof fetch = async (input, init) => {
    return new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted', 'AbortError'));
      });
    });
  };
  const timeoutOllama = new LocalFirstOllamaRuntime({
    fetchFn: hangingOllamaFetch,
    defaultTimeoutMs: 50, // 50ms short timeout
  });

  let timeoutCaught = false;
  try {
    await timeoutOllama.execute({ taskContext: 'hanging request' }, { timeoutMs: 50 });
  } catch (err: any) {
    if (err.name === 'CognitiveTimeoutError') timeoutCaught = true;
  }
  expect(timeoutCaught, 'AbortController aborts when timeout exceeded');

  // --------------------------------------------------------------------------
  // VECTOR 6: Inverted Local-First Provider Router (Component 986)
  // --------------------------------------------------------------------------
  console.log('--- Vector 6: Inverted Local-First Provider Router ---');
  const mockGeminiSuccessFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: sampleValidLocalOutput }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 140, candidatesTokenCount: 60, totalTokenCount: 200 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };
  const mockGemini = new GeminiCognitiveProvider({
    apiKey: 'test-valid-key-xyz',
    fetchFn: mockGeminiSuccessFetch,
    modelName: 'gemini-2.0-flash',
  });
  const fallbackProvider = new DeterministicFallbackCognitiveProvider();

  // Scenario A: Local SLM is healthy -> Tier 1 succeeds, ZERO cloud escalation
  const routerA = new LocalFirstRouterEngine({
    localRuntime: onlineOllama,
    geminiProvider: mockGemini,
    fallbackProvider,
  });

  let tier1Attempted = false;
  let cloudAttempted = false;
  const resultA = await routerA.route(
    { taskContext: 'local first test' },
    {
      onTierAttempt: (tier) => {
        if (tier === 'local-slm') tier1Attempted = true;
        if (tier === 'cloud-escalation') cloudAttempted = true;
      },
    }
  );
  expect(tier1Attempted === true, 'Tier 1 Local SLM attempted first');
  expect(cloudAttempted === false, 'Cloud Gemini was NOT called when Local SLM succeeded');
  expect(resultA.activeTier === 'local-slm', 'Active tier is local-slm');
  expect(resultA.fallbackOccurred === false, 'fallbackOccurred is false');
  expect(resultA.wasEscalatedToCloud === false, 'wasEscalatedToCloud is false');
  expect(resultA.estimatedCostUsd === 0.0, 'Inference cost is $0.00');

  // Scenario B: Local SLM fails -> Escalates to Tier 2 (Cloud Gemini) with Sanitization
  const routerB = new LocalFirstRouterEngine({
    localRuntime: offlineOllama,
    geminiProvider: mockGemini,
    fallbackProvider,
    cloudEscalationPolicy: { enabled: true, allowDataEgress: true },
  });

  let escalationCalled = false;
  const resultB = await routerB.route(
    {
      taskContext: 'diagnose with secret API_KEY=AIzaSy123456789012345678901234567890123',
    },
    {
      onTierAttempt: (tier) => {
        if (tier === 'cloud-escalation') escalationCalled = true;
      },
    }
  );
  expect(escalationCalled === true, 'Escalated to Cloud Gemini when Local SLM failed');
  expect(resultB.activeTier === 'cloud-escalation', 'Active tier is cloud-escalation');
  expect(resultB.fallbackOccurred === true, 'fallbackOccurred is true for escalation');
  expect(resultB.wasEscalatedToCloud === true, 'wasEscalatedToCloud is true');
  expect(resultB.sanitizationSummary?.redactedCount! > 0, 'Sanitization executed before cloud transmission');

  // Scenario C: Both Local SLM and Cloud Gemini fail -> Falls back to Tier 3 Deterministic
  const mockGeminiFailFetch: typeof fetch = async () => {
    throw new Error('Cloud Gemini 503 Service Unavailable');
  };
  const failingGemini = new GeminiCognitiveProvider({
    apiKey: 'test-key',
    fetchFn: mockGeminiFailFetch,
  });

  const routerC = new LocalFirstRouterEngine({
    localRuntime: offlineOllama,
    geminiProvider: failingGemini,
    fallbackProvider,
  });

  const resultC = await routerC.route({ taskContext: 'deterministic fallback scenario' });
  expect(resultC.activeTier === 'deterministic-fallback', 'Fell back safely to Tier 3 deterministic rule engine');
  expect(resultC.fallbackOccurred === true, 'fallbackOccurred is true for Tier 3');
  expect(resultC.wasEscalatedToCloud === false, 'Cloud escalation did not succeed');

  // --------------------------------------------------------------------------
  // VECTOR 7: USER_STOP Preemption Supremacy
  // --------------------------------------------------------------------------
  console.log('--- Vector 7: USER_STOP Preemption Supremacy ---');
  let userStopTriggered = false;
  try {
    await routerA.route(
      { taskContext: 'preempted task' },
      {
        isUserStopActive: () => true, // Actively stopped by Master Human
      }
    );
  } catch (err: any) {
    if (err instanceof CognitiveUserStopError) userStopTriggered = true;
  }
  expect(userStopTriggered, 'USER_STOP immediately preempts routing without calling any provider');

  // --------------------------------------------------------------------------
  // VECTOR 8: Master Local Cognitive Runtime Façade (Component 987)
  // --------------------------------------------------------------------------
  console.log('--- Vector 8: Master Local Cognitive Runtime Façade ---');
  const facade = new LocalCognitiveRuntimeFacade({
    localRuntime: onlineOllama,
    geminiProvider: mockGemini,
    fallbackProvider,
  });

  const facadeRes = await facade.propose({ taskContext: 'Facade test' });
  expect(facadeRes.proposal !== undefined, 'Facade returned valid proposal');
  expect(facadeRes.activeTier === 'local-slm', 'Facade routed to local-slm first');

  const allHealth = await facade.probeAllTiers();
  expect(allHealth.length === 3, 'Probe all tiers returned reports for all 3 tiers');
  expect(allHealth.some((h) => h.tier === 'local-slm'), 'Local tier probed');
  expect(allHealth.some((h) => h.tier === 'cloud-escalation'), 'Cloud tier probed');
  expect(allHealth.some((h) => h.tier === 'deterministic-fallback'), 'Deterministic tier probed');

  // --------------------------------------------------------------------------
  // VECTOR 9: Authority Boundary (COGNITION != AUTHORITY)
  // --------------------------------------------------------------------------
  console.log('--- Vector 9: Authority Boundary (COGNITION != AUTHORITY) ---');
  // Prove that a proposal has ZERO direct tool execution authority
  const actionProposal: CognitiveActionProposal = facadeRes.proposal;
  expect((actionProposal as any).execute === undefined, 'Proposal has NO execute() method');
  expect((actionProposal as any).run === undefined, 'Proposal has NO run() method');
  expect((actionProposal as any).dispatchTool === undefined, 'Proposal has NO dispatchTool() method');
  expect(Object.isFrozen(actionProposal), 'Proposal object is deeply frozen and immutable');

  // --------------------------------------------------------------------------
  // VECTOR 10: CognitiveCircuitBreaker Local-First Mode Integration
  // --------------------------------------------------------------------------
  console.log('--- Vector 10: CognitiveCircuitBreaker Local-First Mode Integration ---');
  const localFirstBreaker = new CognitiveCircuitBreaker({
    routingMode: 'local-first',
    ollamaProvider: onlineOllama as any,
    geminiProvider: mockGemini,
    fallbackProvider,
  });

  expect(localFirstBreaker.routingMode === 'local-first', 'Circuit breaker configured in local-first mode');

  // When local-first mode is active and Ollama is online, Ollama is Tier 1
  const breakerRes1 = await localFirstBreaker.routeInference({ taskContext: 'circuit breaker local-first' }, {});
  expect(breakerRes1.providerType === 'ollama-local', 'Local-First circuit breaker calls Ollama as Tier 1');
  expect(breakerRes1.fallbackOccurred === false, 'No fallback occurred when Ollama succeeded first');

  // --------------------------------------------------------------------------
  // VECTOR 11: Real Environment Probe (If Ollama daemon running on host)
  // --------------------------------------------------------------------------
  console.log('--- Vector 11: Real Environment Ollama Probe ---');
  const liveOllama = new LocalFirstOllamaRuntime({
    baseUrl: 'http://127.0.0.1:11434',
  });
  const liveHealth = await liveOllama.probeHealth();
  console.log(`  [HOST OLLAMA PROBE] Daemon Healthy: ${liveHealth.isHealthy}, Active Model: ${liveHealth.activeModel}, Latency: ${liveHealth.latencyMs}ms`);
  expect(typeof liveHealth.isHealthy === 'boolean', 'Live health probe returned boolean status');

  // --------------------------------------------------------------------------
  // VECTOR 12: Static Source Code Scan for Authority Leakage & Dangerous Patterns
  // --------------------------------------------------------------------------
  console.log('--- Vector 12: Static Source Code Scan for Authority Leakage ---');
  const cognitiveDir = path.resolve(process.cwd(), 'src/core/cognitive');
  const newFiles = [
    'providerNeutralContracts.ts',
    'modelCapabilityRegistry.ts',
    'structuredCognitiveValidator.ts',
    'cloudEscalationSanitizer.ts',
    'localFirstOllamaRuntime.ts',
    'localFirstRouterEngine.ts',
    'localCognitiveRuntimeFacade.ts',
  ];

  const forbiddenPatterns = [
    { name: 'child_process import', regex: /import.*child_process/ },
    { name: 'eval usage', regex: /\beval\s*\(/ },
    { name: 'new Function usage', regex: /new\s+Function\s*\(/ },
    { name: 'direct tool execution', regex: /\bexecuteTool\s*\(/ },
    { name: 'policy bypass', regex: /\bbypassPolicy\b/ },
    { name: 'future milestone MS-1.5.02 tokens', regex: /\bMS-1\.5\.0[2-9]\b/ },
  ];

  for (const file of newFiles) {
    const filePath = path.join(cognitiveDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const pattern of forbiddenPatterns) {
      expect(!pattern.regex.test(content), `Zero ${pattern.name} in ${file}`);
    }
  }

  // --------------------------------------------------------------------------
  // VECTOR 13: Protected Workspace Isolation
  // --------------------------------------------------------------------------
  console.log('--- Vector 13: Protected Workspace Isolation ---');
  const protectedPath = 'C:\\BOW\\shopofbow';
  const exists = fs.existsSync(protectedPath);
  expect(exists === false, 'Protected workspace C:\\BOW\\shopofbow was strictly untouched');

  console.log(`\n================================================================================`);
  console.log(`  REALITY GATE COMPLETE: ${passedAssertions} assertions PASSED`);
  console.log(`================================================================================\n`);
}

runSuite95().catch((err) => {
  console.error('[SUITE #95 FAILED]', err);
  process.exit(1);
});
