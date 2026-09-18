// tests/test_noop_commerce_provider.ts
// Verification of NOOP_COMMERCE_PROVIDER and core commerceRegistry lifecycle

import {
  resetCommerceProvider,
  getActiveCommerceProvider,
  getRawActiveCommerceProvider,
  registerCommerceProvider,
  NOOP_COMMERCE_PROVIDER,
  type CommerceProvider,
} from '../src/core/commerceRegistry.js';

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('RUNNING NOOP_COMMERCE_PROVIDER VERIFICATION SUITE');
  console.log('========================================================================\n');

  // 3a. Clean state check
  console.log('SECTION 3A: Clean State via resetCommerceProvider');
  resetCommerceProvider();
  assert(true, 'resetCommerceProvider() invoked successfully');

  // 3c. Raw active provider should be null when none registered
  console.log('\nSECTION 3C: Raw Provider Verification');
  const rawProvider = getRawActiveCommerceProvider();
  assert(rawProvider === null, 'getRawActiveCommerceProvider() returns null when no provider registered');

  // 3b. Active commerce provider returns NOOP and handles methods safely
  console.log('\nSECTION 3B: NOOP Provider Methods Verification');
  const provider = getActiveCommerceProvider();
  assert(provider !== null, 'getActiveCommerceProvider() returns a non-null provider');
  assert(provider === NOOP_COMMERCE_PROVIDER, 'getActiveCommerceProvider() returns NOOP_COMMERCE_PROVIDER fallback');
  assert(provider.id === 'core_noop', 'NOOP provider id is "core_noop"');
  assert(typeof provider.domainName === 'string', 'NOOP provider domainName is defined string');

  // Test queryCatalog
  let queryResult: any = null;
  let queryThrew = false;
  try {
    queryResult = await provider.queryCatalog({ query: 'test_item' });
  } catch (err) {
    queryThrew = true;
  }
  assert(!queryThrew, 'queryCatalog() does not throw exception');
  assert(Array.isArray(queryResult) && queryResult.length === 0, 'queryCatalog() returns empty array []');

  // Test lookupEntity
  let lookupResult: any = undefined;
  let lookupThrew = false;
  try {
    lookupResult = await provider.lookupEntity('product', 'prod_123');
  } catch (err) {
    lookupThrew = true;
  }
  assert(!lookupThrew, 'lookupEntity() does not throw exception');
  assert(lookupResult === null, 'lookupEntity() returns null');

  // Test executeCommerceAction
  let actionResult: any = null;
  let actionThrew = false;
  try {
    actionResult = await provider.executeCommerceAction({
      type: 'order_create',
      payload: { item: 'dummy' },
    });
  } catch (err) {
    actionThrew = true;
  }
  assert(!actionThrew, 'executeCommerceAction() does not throw exception');
  assert(actionResult !== null && typeof actionResult === 'object', 'executeCommerceAction() returns result object');
  assert(actionResult.success === false, 'executeCommerceAction() returns success: false');
  assert(
    actionResult.error === 'No active commerce domain provider registered in Core registry.',
    'executeCommerceAction() returns deterministic no-provider error message'
  );
  assert(actionResult.type === 'order_create', 'executeCommerceAction() preserves action type');
  assert(typeof actionResult.actionId === 'string' && actionResult.actionId.startsWith('noop_'), 'executeCommerceAction() generates noop_ actionId');

  // Test getMetrics & getHealth
  const metrics = await provider.getMetrics();
  assert(typeof metrics === 'object' && metrics !== null, 'getMetrics() returns metrics object');

  const health = await provider.getHealth();
  assert(health.status === 'healthy', 'getHealth() returns healthy status');
  assert(health.details?.standalone === true && health.details?.registeredProvider === false, 'getHealth() details reflect standalone un-registered state');

  // 3d. Register a minimal fake provider
  console.log('\nSECTION 3D: Custom Provider Registration');
  const fakeProvider: CommerceProvider = {
    id: 'fake_test_provider',
    domainName: 'Fake Test Domain',
    async queryCatalog(q) {
      return [{ id: 'mock_1', name: 'Mock Product' }];
    },
    async lookupEntity(type, id) {
      return { id, type, name: 'Mock Entity' };
    },
    async executeCommerceAction(action) {
      return {
        actionId: 'fake_act_1',
        type: action.type,
        success: true,
      };
    },
    async getMetrics() {
      return { mockMetric: 42 };
    },
    async getHealth() {
      return { status: 'healthy', details: { fake: true } };
    },
  };

  registerCommerceProvider(fakeProvider);

  const currentRaw = getRawActiveCommerceProvider();
  assert(currentRaw === fakeProvider, 'getRawActiveCommerceProvider() returns registered fakeProvider');

  const currentActive = getActiveCommerceProvider();
  assert(currentActive === fakeProvider, 'getActiveCommerceProvider() returns registered fakeProvider (not NOOP)');
  assert(currentActive.id === 'fake_test_provider', 'Active provider has fake_test_provider id');

  const customQueryResult = await currentActive.queryCatalog({ query: 'shoes' });
  assert(customQueryResult.length === 1 && customQueryResult[0].id === 'mock_1', 'Fake provider queryCatalog() returns custom data');

  const customActionResult = await currentActive.executeCommerceAction({ type: 'test_action' });
  assert(customActionResult.success === true && customActionResult.actionId === 'fake_act_1', 'Fake provider executeCommerceAction() returns success: true');

  // Clean up
  resetCommerceProvider();
  assert(getRawActiveCommerceProvider() === null, 'resetCommerceProvider() cleans up registered provider back to null');
  assert(getActiveCommerceProvider() === NOOP_COMMERCE_PROVIDER, 'getActiveCommerceProvider() falls back to NOOP after cleanup');

  console.log('\n========================================================================');
  console.log(`SUITE COMPLETE: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});
