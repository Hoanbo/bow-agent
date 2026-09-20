// scripts/run_voice_body_regression.ts
// BOWCON V4.0 — UNIFIED VOICE PIPELINE & BODY PROTOCOL REGRESSION TEST RUNNER
//
// Runs all 12 security, voice pipeline, and body protocol test suites in isolated child processes,
// measuring execution time and reporting unified regression status.

import { spawnSync } from 'node:child_process';
import path from 'node:path';

interface TestSpec {
  id: number;
  domain: 'Security' | 'Voice Pipeline' | 'Body Protocol';
  name: string;
  filePath: string;
}

const TEST_SUITES: TestSpec[] = [
  // --- Domain: Security ---
  {
    id: 1,
    domain: 'Security',
    name: 'TLS 1.3 / WSS Hardening & Pinning',
    filePath: 'tests/security/test_tls_wss_hardening.ts',
  },
  {
    id: 2,
    domain: 'Security',
    name: 'Body Protocol PSK Handshake Auth',
    filePath: 'tests/security/test_body_auth.ts',
  },
  {
    id: 3,
    domain: 'Security',
    name: 'Voice & Body Endpoint Auth Hardening',
    filePath: 'tests/security/test_voice_auth_hardening.ts',
  },
  {
    id: 4,
    domain: 'Security',
    name: 'PTT Test-Only Simulation Guard',
    filePath: 'tests/security/test_ptt_test_only_guard.ts',
  },

  // --- Domain: Voice Pipeline ---
  {
    id: 5,
    domain: 'Voice Pipeline',
    name: 'Visual Privacy Indicator Guard',
    filePath: 'tests/voicePipeline/test_privacy_indicator_guard.ts',
  },
  {
    id: 6,
    domain: 'Voice Pipeline',
    name: 'PTT Timeout Beep Alert & Anomaly',
    filePath: 'tests/voicePipeline/test_ptt_timeout_beep.ts',
  },
  {
    id: 7,
    domain: 'Voice Pipeline',
    name: 'PTT Flow & Physical Acoustic Cues',
    filePath: 'tests/voicePipeline/test_ptt_and_beep_indicator.ts',
  },
  {
    id: 8,
    domain: 'Voice Pipeline',
    name: 'TTS WAV Lifecycle & Fail-safe Cleanup',
    filePath: 'tests/voicePipeline/test_tts_wav_cleanup.ts',
  },
  {
    id: 9,
    domain: 'Voice Pipeline',
    name: 'PII Redactor & Two-Stream Hygiene',
    filePath: 'tests/voicePipeline/test_pii_redactor.ts',
  },
  {
    id: 10,
    domain: 'Voice Pipeline',
    name: 'Voice Roundtrip Global E2E Timeout',
    filePath: 'tests/voicePipeline/test_voice_e2e_timeout.ts',
  },

  // --- Domain: Body Protocol ---
  {
    id: 11,
    domain: 'Body Protocol',
    name: 'Hanging Pending Command Cleanup',
    filePath: 'tests/bodyProtocol/test_body_registry_fail_pending.ts',
  },
  {
    id: 12,
    domain: 'Body Protocol',
    name: 'Audio Body Driver & PDP E2E Slice',
    filePath: 'tests/bodyProtocol/test_body_audio.ts',
  },
];

interface TestResult {
  spec: TestSpec;
  passed: boolean;
  durationMs: number;
  errorSnippet?: string;
}

async function runAllSuites(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🛡️  BOWCON V4.0 — REGRESSION TEST SUITE (VOICE PIPELINE & BODY PROTOCOL)');
  console.log('='.repeat(80));
  console.log(`Executing ${TEST_SUITES.length} test suites across 3 domains sequentially...\n`);

  const results: TestResult[] = [];
  const totalStartTime = Date.now();

  for (const spec of TEST_SUITES) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`>>> [${spec.id}/${TEST_SUITES.length}] [${spec.domain}] ${spec.name}`);
    console.log(`>>> File: ${spec.filePath}`);
    console.log(`${'='.repeat(70)}`);
    const suiteStart = Date.now();

    const tsxCliPath = path.resolve('node_modules/tsx/dist/cli.mjs');

    const child = spawnSync(process.execPath, [tsxCliPath, spec.filePath], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' },
    });

    const durationMs = Date.now() - suiteStart;
    const passed = child.status === 0;

    if (passed) {
      console.log(`\n[SUITE RESULT] [${spec.id}] ${spec.name}: PASS (${(durationMs / 1000).toFixed(2)}s)`);
      results.push({ spec, passed: true, durationMs });
    } else {
      console.log(`\n[SUITE RESULT] [${spec.id}] ${spec.name}: FAIL (${(durationMs / 1000).toFixed(2)}s)`);
      results.push({ spec, passed: false, durationMs, errorSnippet: `Exit code: ${child.status}` });
    }
  }

  const totalElapsedSec = ((Date.now() - totalStartTime) / 1000).toFixed(2);
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  console.log('\n' + '='.repeat(80));
  console.log('📊 REGRESSION TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('ID | Domain         | Test Suite Name                          | Status | Duration');
  console.log('-'.repeat(80));

  for (const r of results) {
    const idStr = r.spec.id.toString().padStart(2, ' ');
    const domStr = r.spec.domain.padEnd(14, ' ');
    const nameStr = r.spec.name.padEnd(40, ' ');
    const statusStr = r.passed ? '✅ PASS' : '❌ FAIL';
    const durStr = `${(r.durationMs / 1000).toFixed(2)}s`.padStart(7, ' ');
    console.log(`${idStr} | ${domStr} | ${nameStr} | ${statusStr} | ${durStr}`);
  }

  console.log('-'.repeat(80));
  console.log(`TOTAL: ${results.length} suites | PASSED: ${passedCount} | FAILED: ${failedCount} | TIME: ${totalElapsedSec}s`);
  console.log('='.repeat(80) + '\n');

  if (failedCount > 0) {
    console.error('❌ REGRESSION FAILURE DETECTED in the following suites:');
    for (const r of results.filter((x) => !x.passed)) {
      console.error(`\nSuite [${r.spec.id}] ${r.spec.name} (${r.spec.filePath}):`);
      console.error(r.errorSnippet);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL 12 VOICE PIPELINE & BODY PROTOCOL TEST SUITES PASSED 100% WITH ZERO REGRESSION!\n');
    process.exit(0);
  }
}

runAllSuites();
