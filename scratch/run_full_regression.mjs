// scratch/run_full_regression.mjs
import { execSync } from 'node:child_process';

const suites = [
  'tests/test_v4_memory_session_isolation.ts',
  'tests/test_v4_durable_memory_persistence.ts',
  'tests/test_v4_multi_user_durable_memory.ts',
  'tests/test_v4_multi_tenant_approval_idempotency.ts',
  'tests/test_v4_agent_voice_runtime.ts',
  'tests/test_v4_agent_voice_quality.ts',
  'tests/test_v4_agent_conversation_context.ts',
  'tests/test_v4_agent_intent_understanding.ts',
  'tests/test_v4_agent_planning.ts',
  'tests/test_v4_agent_decision_reasoning.ts',
  'tests/test_v4_agent_action_orchestration.ts',
  'tests/test_v4_agent_tool_execution.ts',
  'tests/test_v4_agent_lifecycle.ts',
  'tests/test_v4_agent_execution_verification.ts',
  'tests/test_v4_agent_durable_commit.ts',
  'tests/test_v4_agent_brain_recovery.ts',
  'tests/test_v4_agent_brain_coordination.ts',
  'tests/test_v4_agent_brain_synchronization.ts',
  'tests/test_v4_agent_loop.ts',
  'tests/test_v4_architecture_contract.ts',
  'tests/test_v4_agent_brain_transport.ts',
  'tests/test_v4_agent_secure_remote_gateway.ts',
  'tests/test_v4_agent_real_network_adapter.ts',
  'tests/test_v4_agent_real_bidirectional_connection.ts',
  'tests/test_v4_agent_device_pairing_trust.ts',
  'tests/test_v4_agent_persistent_device_identity.ts',
  'tests/test_v4_agent_secure_device_vault.ts',
  'tests/test_v4_agent_zero_trust_admission.ts',
  'tests/test_v4_agent_secure_always_on_brain_relay.ts',
  'tests/test_v4_agent_secure_real_wire_transport.ts',
  'tests/test_v4_production_secure_internet_edge.ts',
  'tests/test_v4_agent_real_brain_runtime.ts',
  'tests/test_v4_agent_real_brain_service.ts',
  'tests/test_v4_agent_real_cognitive_provider.ts',
  'tests/test_v4_agent_real_world_action_runtime.ts',
  'tests/test_v4_agent_real_capability_runtime.ts',
];

let grandTotalPassed = 0;
let grandTotalFailed = 0;
const results = [];

console.log(`Running all ${suites.length} test suites in BOWCON V4.0...\n`);

for (const suite of suites) {
  process.stdout.write(`Executing ${suite}... `);
  try {
    const output = execSync(`node --import tsx ${suite}`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
    // Extract passed count if present
    const passMatches = output.match(/(?:TOTAL ASSERTIONS PASSED|REALITY GATE COMPLETE):\s*(\d+)/i) || output.match(/PASS/g);
    let count = 1;
    if (passMatches && passMatches[1]) {
      count = parseInt(passMatches[1], 10);
    } else if (passMatches) {
      count = passMatches.length;
    }
    grandTotalPassed += count;
    results.push({ suite, status: 'PASS', count });
    console.log(`PASS (${count} assertions)`);
  } catch (err) {
    grandTotalFailed++;
    results.push({ suite, status: 'FAIL', error: err.message });
    console.log(`FAIL\n${err.stdout || ''}\n${err.stderr || ''}`);
  }
}

console.log('\n============================================================');
console.log(`REGRESSION SUMMARY: ${suites.length} suites executed`);
console.log(`Total Passed Assertions: ${grandTotalPassed}`);
console.log(`Total Failed Suites: ${grandTotalFailed}`);
console.log('============================================================');

for (const r of results) {
  console.log(`  ${r.status}: ${r.suite} (${r.count || 0})`);
}

if (grandTotalFailed > 0) {
  process.exit(1);
}
