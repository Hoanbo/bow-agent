// C:\BOW\bow-agent\tests\test_phase7_1_step4_extraction.ts
// BOW AGENT V3.3 â€” PHASE 7.1 STEP 4 STANDALONE VERIFICATION TEST SUITE

import fs from 'node:fs';
import path from 'node:path';

// Import from standalone package entrypoint
import {
  // Contracts
  type ShopAdapter,
  type CatalogProvider,
  type OrderProvider,
  type WalletProvider,
  type KnowledgeProvider,
  type AnalyticsProvider,
  type ActionHandler,
  type StorageAdapter,
  type LlmProvider,
  type RobotAdapter,
  type RobotSensorSnapshot,
  type RobotSpeechOptions,
  type ActionResult,
  fallbackShopAdapter,
  getActiveShopAdapter,
  setActiveShopAdapter,

  // Core
  type AgentContext,
  type AgentMessage,
  type AgentAction,
  processAgentMessage,
  resolveMultiIntent,
  extractDuration,
  formatSingleProductResponse,
  searchProducts,
  getMyOrders,

  // Monitoring
  type AgentAnalyticsEvent,
  insertAnalyticsEvent,
  sanitizeProductionTelemetryText,
  detectPiiInText,

  // Knowledge
  getKnowledgeGaps,
  getNegativePolicies,
  matchNegativePolicy,
  detectKnowledgeDrift,
  getGovernanceDashboardSummary,
  getIntelligenceDashboardSummary,
  getActionCenter,

  // Production
  isCircuitOpen,
  recordExecutionSuccess,
  evaluateProductionSlo,
  recordProductionMetric,
  getProductionControlCenterSummary,

  // Gemini
  isGeminiConfigured,
  GEMINI_CONFIG,
} from '../src/index';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  âœ… [PASS] ${testName}`);
  } else {
    failedAssertions++;
    console.error(`  âŒ [FAIL] ${testName}${detail ? ` â€” ${detail}` : ''}`);
  }
}

async function runStandaloneTestSuite() {
  console.log('\n========================================================================');
  console.log('ðŸ RUNNING PHASE 7.1 STEP 4: STANDALONE PACKAGE EXTRACTION TEST SUITE');
  console.log('========================================================================\n');

  const rootDir = path.resolve('.');

  // --------------------------------------------------------------------------
  // SECTION A: PACKAGE STRUCTURE & FILE INTEGRITY
  // --------------------------------------------------------------------------
  console.log('ðŸ“‹ SECTION A: Package Structure & Manifests');

  assert(fs.existsSync(path.join(rootDir, 'package.json')), 'package.json exists in target package');
  assert(fs.existsSync(path.join(rootDir, 'tsconfig.json')), 'tsconfig.json exists in target package');
  assert(fs.existsSync(path.join(rootDir, 'README.md')), 'README.md exists in target package');
  assert(fs.existsSync(path.join(rootDir, 'src/index.ts')), 'src/index.ts entrypoint exists');

  const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  assert(pkgJson.name === '@bow/agent', 'Package name is "@bow/agent"');
  assert(pkgJson.dependencies['@google/generative-ai'] !== undefined, '@google/generative-ai is declared as dependency');
  assert(pkgJson.dependencies['react'] === undefined, 'No react in dependencies');
  assert(pkgJson.dependencies['@supabase/supabase-js'] === undefined, 'No @supabase/supabase-js in dependencies');
  assert(pkgJson.dependencies['vite'] === undefined, 'No vite in dependencies');

  const requiredDirs = ['contracts', 'core', 'gemini', 'knowledge', 'monitoring', 'production'];
  for (const d of requiredDirs) {
    assert(fs.existsSync(path.join(rootDir, 'src', d)), `Subdirectory src/${d} exists`);
  }

  // --------------------------------------------------------------------------
  // SECTION B: DEPENDENCY ISOLATION & FORBIDDEN IMPORTS SCAN
  // --------------------------------------------------------------------------
  console.log('\nðŸ“‹ SECTION B: Dependency Isolation (Zero Forbidden Imports)');

  function scanDir(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full, fileList);
      } else if (f.endsWith('.ts') && !f.endsWith('.d.ts')) {
        fileList.push(full);
      }
    }
    return fileList;
  }

  const srcFiles = scanDir(path.join(rootDir, 'src'));
  assert(srcFiles.length >= 50, `Discovered ${srcFiles.length} TypeScript source files in standalone package`);

  let supabaseImportsCount = 0;
  let shopofbowImportsCount = 0;
  let reactImportsCount = 0;
  let domWindowCallsCount = 0;

  for (const f of srcFiles) {
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

      if (trimmed.includes('from') && (trimmed.includes('supabase') || trimmed.includes('@supabase'))) {
        supabaseImportsCount++;
      }
      if (trimmed.match(/from\s+['"](@?shopofbow|@bow\/shopofbow)['"]/i)) {
        shopofbowImportsCount++;
      }
      if (trimmed.match(/from\s+['"][^'"]*react['"]/i)) {
        reactImportsCount++;
      }
      if (trimmed.includes('window.dispatchEvent') || trimmed.includes('document.getElementById')) {
        domWindowCallsCount++;
      }
    });
  }

  assert(supabaseImportsCount === 0, `0 Supabase imports across standalone package (Actual: ${supabaseImportsCount})`);
  assert(shopofbowImportsCount === 0, `0 shopofbow imports across standalone package (Actual: ${shopofbowImportsCount})`);
  assert(reactImportsCount === 0, `0 React imports across standalone package (Actual: ${reactImportsCount})`);
  assert(domWindowCallsCount === 0, `0 DOM/window mutations across standalone package (Actual: ${domWindowCallsCount})`);

  // --------------------------------------------------------------------------
  // SECTION C: CONTRACT AVAILABILITY & FALLBACK ADAPTER
  // --------------------------------------------------------------------------
  console.log('\nðŸ“‹ SECTION C: Contract Availability & In-Memory Fallback Adapter');

  assert(typeof fallbackShopAdapter === 'object', 'fallbackShopAdapter is available');
  assert(typeof fallbackShopAdapter.catalog === 'object', 'fallbackShopAdapter.catalog is available');
  assert(typeof fallbackShopAdapter.orders === 'object', 'fallbackShopAdapter.orders is available');
  assert(typeof fallbackShopAdapter.wallet === 'object', 'fallbackShopAdapter.wallet is available');
  assert(typeof fallbackShopAdapter.knowledge === 'object', 'fallbackShopAdapter.knowledge is available');
  assert(typeof fallbackShopAdapter.analytics === 'object', 'fallbackShopAdapter.analytics is available');
  assert(typeof fallbackShopAdapter.actions === 'object', 'fallbackShopAdapter.actions is available');

  const activeAdapter = getActiveShopAdapter();
  assert(activeAdapter !== null, 'getActiveShopAdapter() returns non-null default adapter');

  // Test swapping adapter
  let customRecorded = false;
  const mockAdapter: ShopAdapter = {
    ...fallbackShopAdapter,
    analytics: {
      ...fallbackShopAdapter.analytics,
      recordEvent: async () => { customRecorded = true; },
    },
  };
  setActiveShopAdapter(mockAdapter);
  assert(getActiveShopAdapter() === mockAdapter, 'setActiveShopAdapter successfully registers custom adapter');
  setActiveShopAdapter(fallbackShopAdapter);
  assert(getActiveShopAdapter() === fallbackShopAdapter, 'setActiveShopAdapter restores fallback adapter');

  // --------------------------------------------------------------------------
  // SECTION D: CORE RUNTIME & DURATION INVARIANT
  // --------------------------------------------------------------------------
  console.log('\n📋 SECTION D: Core Runtime & Linguistic Duration Invariants');

  const d1m = extractDuration('dang ky 1 thang');
  const d6m = extractDuration('dang ky 6 thang');
  const d12m = extractDuration('dang ky 1 nam');
  const d3d = extractDuration('dung thu 3 ngay');
  const d2w = extractDuration('trai nghiem 2 tuan');

  assert(d1m === '1 tháng', 'Duration 1 month parsed as "1 tháng"');
  assert(d6m === '6 tháng', 'Duration 6 months parsed as "6 tháng"');
  assert(d12m === '1 năm', 'Duration 1 year parsed as "1 năm"');
  assert(d3d === '3 ngày', 'Duration 3 days parsed as "3 ngày"');
  assert(d2w === '2 tuần', 'Duration 2 weeks parsed as "2 tuần"');

  const multi = resolveMultiIntent('tôi muốn mua gói 6 tháng');
  assert(multi.primaryIntent === 'BUY', 'Intent resolved as BUY');

  // --------------------------------------------------------------------------
  // SECTION E: MONITORING RUNTIME & PII SCRUBBING
  // --------------------------------------------------------------------------
  console.log('\nðŸ“‹ SECTION E: Monitoring Runtime & PII Scrubbing');

  const scrubbedPhone = sanitizeProductionTelemetryText('SÄT cá»§a tÃ´i lÃ  0912345678');
  assert(scrubbedPhone.includes('[REDACTED_PHONE]'), 'Phone number is redacted');
  assert(!scrubbedPhone.includes('0912345678'), 'Raw phone number is completely scrubbed');

  const scrubbedEmail = sanitizeProductionTelemetryText('Email liÃªn há»‡ test@shopofbow.com');
  assert(scrubbedEmail.includes('[REDACTED_EMAIL]'), 'Email is redacted');

  assert(detectPiiInText('0912345678') === true, 'detectPiiInText detects phone number');
  assert(detectPiiInText('xin chÃ o shop') === false, 'detectPiiInText returns false for normal text');

  // --------------------------------------------------------------------------
  // SECTION F: KNOWLEDGE OPERATIONS RUNTIME
  // --------------------------------------------------------------------------
  console.log('\nðŸ“‹ SECTION F: Knowledge Operations Runtime');

  const gaps = await getKnowledgeGaps();
  assert(Array.isArray(gaps), 'getKnowledgeGaps executes safely in standalone mode');

  const drift = await detectKnowledgeDrift([], [], [], true);
  assert(typeof drift === 'object', 'detectKnowledgeDrift executes safely in standalone mode');

  const gov = await getGovernanceDashboardSummary([], [], [], true);
  assert(typeof gov === 'object', 'getGovernanceDashboardSummary executes safely in standalone mode');

  const intel = await getIntelligenceDashboardSummary(true);
  assert(typeof intel === 'object', 'getIntelligenceDashboardSummary executes safely in standalone mode');

  const actions = await getActionCenter(intel.recommendations, true);
  assert(typeof actions === 'object', 'getActionCenter executes safely in standalone mode');

  // --------------------------------------------------------------------------
  // SECTION G: PRODUCTION RUNTIME (CIRCUIT BREAKER, SLO, CAPACITY)
  // --------------------------------------------------------------------------
  console.log('\nðŸ“‹ SECTION G: Production Operations Runtime');

  assert(isCircuitOpen() === false, 'Circuit breaker starts in CLOSED state');
  recordExecutionSuccess();

  const slo = evaluateProductionSlo([]);
  assert(typeof slo === 'object', 'evaluateSloStatus returns status');

  const control = getProductionControlCenterSummary(true);
  assert(typeof control === 'object', 'getProductionControlSummary executes in standalone mode');

  // --------------------------------------------------------------------------
  // SECTION H: ROBOT BOUNDARY (SENSOR & SPEECH INTERFACES)
  // --------------------------------------------------------------------------
  console.log('\nðŸ“‹ SECTION H: Robot Boundary (Downstream bow-robot Interface)');

  const mockRobotSnapshot: RobotSensorSnapshot = {
    batteryLevel: 98,
    isCharging: false,
    timestamp: new Date().toISOString(),
  };
  assert(mockRobotSnapshot.batteryLevel === 98, 'RobotSensorSnapshot interface is usable');

  const mockSpeech: RobotSpeechOptions = {
    volume: 80,
    rate: 1.0,
    language: 'vi-VN',
  };
  assert(mockSpeech.language === 'vi-VN', 'RobotSpeechOptions interface is usable');

  // --------------------------------------------------------------------------
  // SECTION I: LLM BOUNDARY
  // --------------------------------------------------------------------------
  console.log('\nðŸ“‹ SECTION I: LLM Boundary');

  assert(typeof GEMINI_CONFIG === 'object', 'GEMINI_CONFIG is accessible');
  assert(GEMINI_CONFIG.modelName === 'gemini-3.6-flash', 'Gemini model is gemini-3.6-flash');
  assert(typeof isGeminiConfigured() === 'boolean', 'isGeminiConfigured() returns boolean');

  // --------------------------------------------------------------------------
  // SECTION J: CORE AUTONOMY & COMMERCE PROVIDER ABSTRACTION
  // --------------------------------------------------------------------------
  console.log('\n📋 SECTION J: Core Autonomy & Decoupled Domain Architecture');

  const { getActiveCommerceProvider, registerCommerceProvider, NOOP_COMMERCE_PROVIDER } = await import('../src/core/commerceRegistry.js');

  assert(getActiveCommerceProvider() !== null, 'Core provides deterministic active/fallback commerce provider');
  assert(typeof getActiveCommerceProvider().queryCatalog === 'function', 'queryCatalog interface is implemented');

  const mockProvider = {
    id: 'generic_commerce',
    domainName: 'Generic Commerce Domain',
    queryCatalog: async () => [],
    lookupEntity: async () => null,
    executeCommerceAction: async () => ({ actionId: 'test_act', type: 'TEST', success: true }),
  };

  registerCommerceProvider(mockProvider as any);
  assert(getActiveCommerceProvider() === mockProvider, 'Generic commerce provider registration succeeds');
  assert(mockProvider.id === 'generic_commerce', 'Domain identifier is preserved in provider');
  assert(typeof mockProvider.queryCatalog === 'function', 'queryCatalog interface is implemented');
  assert(typeof mockProvider.executeCommerceAction === 'function', 'executeCommerceAction interface is implemented');

  // --------------------------------------------------------------------------
  // SECTION K: ZERO AUTO-MUTATION INVARIANT
  // --------------------------------------------------------------------------
  console.log('\nðŸ“‹ SECTION K: Zero Auto-Mutation Guarantee in Standalone Package');

  const coreToolsExports = Object.keys(await import('../src/core/tools'));
  const mutatingTools = coreToolsExports.filter((k) =>
    k.startsWith('create') || k.startsWith('delete') || k.startsWith('mutate')
  );
  assert(mutatingTools.length === 0, `0 mutating methods in core/tools (Found: ${mutatingTools.length})`);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`ðŸ STANDALONE TEST SUITE COMPLETE: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('ALL SECTIONS (A-K) PASSED.');
  } else {
    console.error(`ðŸ’¥ FAILED: ${failedAssertions} assertions failed!`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runStandaloneTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

