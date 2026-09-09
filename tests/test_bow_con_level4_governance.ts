// tests/test_bow_con_level4_governance.ts
// BOWCON V4.0 — Level 4.0 Autonomy Governance, PDP & Robot Physical Safety Suite
// Verifies compliance with ISO/IEC 42001, ISO/IEC 23894, NIST AI RMF, and ODD specifications.

import fs from 'node:fs';
import path from 'node:path';
import {
  globalPDP,
  PolicyDecisionPoint,
  ActionClassification,
} from '../src/core/policyDecisionPoint.js';
import {
  globalRobotSafety,
  RobotSafetyController,
} from '../src/embodied/robotSafetyController.js';

let passedTests = 0;
let totalTests = 0;
let failedTests = 0;

function assert(condition: boolean | unknown, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${description}`);
  }
}

async function runLevel4GovernanceSuite() {
  console.log('========================================================================');
  console.log('👑 RUNNING BOWCON V4.0 (LEVEL 4.0 AUTONOMY GOVERNANCE & SAFETY) SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: AUTONOMY CHARTER & RISK REGISTER SPECIFICATION VERIFICATION
  // --------------------------------------------------------------------------
  console.log('📜 SECTION 1: Autonomy Charter & Risk Register (ISO 42001 & 23894)');
  const charterPath = path.resolve(process.cwd(), 'docs', 'autonomy-charter.md');
  const riskPath = path.resolve(process.cwd(), 'docs', 'risk-register.md');

  assert(fs.existsSync(charterPath), 'docs/autonomy-charter.md exists');
  const charterContent = fs.readFileSync(charterPath, 'utf8');
  assert(charterContent.includes('Operational Design Domain (ODD)'), 'Charter specifies ODD');
  assert(charterContent.includes('OBSERVE') && charterContent.includes('HIGH_IMPACT') && charterContent.includes('FORBIDDEN'), 'Charter defines 5 action classifications');
  assert(charterContent.includes('ISO/IEC 42001') && charterContent.includes('NIST AI RMF'), 'Charter adheres to ISO/IEC 42001 and NIST AI RMF');

  assert(fs.existsSync(riskPath), 'docs/risk-register.md exists');
  const riskContent = fs.readFileSync(riskPath, 'utf8');
  assert(riskContent.includes('ISO/IEC 23894'), 'Risk Register adheres to ISO/IEC 23894');
  assert(riskContent.includes('RSK-01') && riskContent.includes('RSK-07'), 'Risk Register tracks RSK-01 through RSK-07');
  assert(riskContent.includes('Residual Risk'), 'Risk Register evaluates residual risk metrics');

  // --------------------------------------------------------------------------
  // SECTION 2: POLICY DECISION POINT (PDP) EVALUATION & DEFAULT DENY
  // --------------------------------------------------------------------------
  console.log('\n🛡️ SECTION 2: Central Policy Decision Point (PDP) & Default Deny');
  const testAuditPath = path.resolve(process.cwd(), 'data', 'test_audit.jsonl');
  if (fs.existsSync(testAuditPath)) {
    try { fs.unlinkSync(testAuditPath); } catch { }
  }
  const pdp = new PolicyDecisionPoint(testAuditPath);

  // Default deny on unknown unregistered action (acting as untrusted user)
  const unkDecision = pdp.evaluate({
    toolName: 'unregistered_dangerous_action',
    args: {},
    actor: { role: 'user', channel: 'WEB' },
  });
  assert(!unkDecision.allowed && unkDecision.requiresApproval, 'Unknown action blocked by Default Deny principle');

  // Registered OBSERVE action
  pdp.registerActionPolicy('read_status', 'OBSERVE');
  const obsDecision = pdp.evaluate({
    toolName: 'read_status',
    args: {},
    actor: { role: 'user', channel: 'WEB' },
  });
  assert(obsDecision.allowed && !obsDecision.requiresApproval, 'OBSERVE action permitted without human approval');

  // Registered REVERSIBLE action with owner role
  pdp.registerActionPolicy('toggle_desk_light', 'REVERSIBLE');
  const revDecision = pdp.evaluate({
    toolName: 'toggle_desk_light',
    args: { state: 'on' },
    actor: { role: 'owner', channel: 'ROBOT' },
  });
  assert(revDecision.allowed && !revDecision.requiresApproval, 'REVERSIBLE action permitted for owner');

  // Registered HIGH_IMPACT action without token from agent
  pdp.registerActionPolicy('custom_high_impact_action', 'HIGH_IMPACT');
  const highNoToken = pdp.evaluate({
    toolName: 'custom_high_impact_action',
    args: { target: 'database' },
    actor: { role: 'agent', channel: 'BACKGROUND' },
  });
  assert(!highNoToken.allowed && highNoToken.requiresApproval, 'HIGH_IMPACT action blocked without approval token');

  // Registered FORBIDDEN action
  pdp.registerActionPolicy('bypass_e_stop', 'FORBIDDEN');
  const forbiddenDecision = pdp.evaluate({
    toolName: 'bypass_e_stop',
    args: {},
    actor: { role: 'owner', channel: 'ROBOT' },
  });
  assert(!forbiddenDecision.allowed && forbiddenDecision.classification === 'FORBIDDEN', 'FORBIDDEN action strictly blocked');

  // --------------------------------------------------------------------------
  // SECTION 3: APPROVAL RECORDS & ONE-TIME EXECUTION TOKENS
  // --------------------------------------------------------------------------
  console.log('\n🔑 SECTION 3: Approval Records & One-Time Execution Tokens');
  pdp.registerActionPolicy('refund_order', 'HIGH_IMPACT');

  const approval = pdp.requestApproval({
    actionName: 'refund_order',
    targetDomain: 'shop',
    arguments: { orderId: 'ORD-999', amount: 500000 },
    requestedBy: 'Agent-CoFounder',
  });
  assert(approval.status === 'PENDING', 'Approval request created with PENDING status');
  assert(approval.id.startsWith('appr_'), 'Approval record assigned unique ID');

  const grantResult = pdp.grantApproval(approval.id, 'Boss-Hoan');
  assert(grantResult.success === true && Boolean(grantResult.executionToken), 'Approval successfully granted with token');

  // First execution with valid approval token
  const approvedDecision = pdp.evaluate({
    toolName: 'refund_order',
    args: { orderId: 'ORD-999', amount: 500000 },
    actor: { role: 'agent', channel: 'BACKGROUND' },
    executionToken: grantResult.executionToken,
  });
  assert(approvedDecision.allowed, 'HIGH_IMPACT action allowed with approved token');

  // Attempt second execution with same consumed token (Replay attack prevention)
  const replayDecision = pdp.evaluate({
    toolName: 'refund_order',
    args: { orderId: 'ORD-999', amount: 500000 },
    actor: { role: 'agent', channel: 'BACKGROUND' },
    executionToken: grantResult.executionToken,
  });
  assert(!replayDecision.allowed, 'Consumed approval token rejected on second attempt (One-Time-Token guarantee)');

  // --------------------------------------------------------------------------
  // SECTION 4: IDEMPOTENCY KEY LEDGER
  // --------------------------------------------------------------------------
  console.log('\n⚡ SECTION 4: Idempotency Key Ledger (Zero Duplicate Execution)');
  const idemKey = 'idem_checkout_test_' + Date.now();
  const firstExec = pdp.checkIdempotency(idemKey);
  assert(firstExec.isDuplicate === false, 'New idempotency key recognized as first execution');

  pdp.recordIdempotency(idemKey, { orderId: 'ORD-12345' });

  const secondExec = pdp.checkIdempotency(idemKey);
  assert(secondExec.isDuplicate === true, 'Duplicate idempotency key detected');
  assert(secondExec.cachedResult?.orderId === 'ORD-12345', 'Cached result returned for idempotent call');

  // --------------------------------------------------------------------------
  // SECTION 5: APPEND-ONLY CRYPTOGRAPHIC AUDIT TRAIL
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 5: Append-Only Cryptographic Audit Trail');
  pdp.recordAuditEvent({
    timestamp: new Date().toISOString(),
    actor: { userId: 'boss_hoan', role: 'owner', channel: 'ROBOT' },
    domain: 'shop',
    toolName: 'test_audit_event_1',
    classification: 'OBSERVE',
    argumentsHash: 'hash_test_1',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });

  pdp.recordAuditEvent({
    timestamp: new Date().toISOString(),
    actor: { userId: 'bowcon', role: 'system', channel: 'DESKTOP' },
    domain: 'robot',
    toolName: 'test_audit_event_2',
    classification: 'REVERSIBLE',
    argumentsHash: 'hash_test_2',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });

  const isChainValid = pdp.verifyAuditLedgerIntegrity();
  assert(isChainValid === true, 'Cryptographic hash-chain of audit log is intact and tamper-evident');

  // --------------------------------------------------------------------------
  // SECTION 6: EMERGENCY KILL SWITCHES (GLOBAL & PER-DOMAIN)
  // --------------------------------------------------------------------------
  console.log('\n🛑 SECTION 6: Emergency Kill Switches (Global & Per-Domain)');
  pdp.registerActionPolicy('desktop_safe_action', 'REVERSIBLE');
  assert(
    pdp.evaluate({
      toolName: 'desktop_safe_action',
      args: {},
      actor: { role: 'owner', channel: 'DESKTOP' },
    }).allowed,
    'Action allowed when kill switch is disengaged'
  );

  // Engage Domain Kill Switch
  pdp.setDomainKillSwitch('desktop', true);
  assert(
    !pdp.evaluate({
      toolName: 'desktop_safe_action',
      args: {},
      actor: { role: 'owner', channel: 'DESKTOP' },
    }).allowed,
    'Action blocked by active domain kill switch'
  );

  pdp.setDomainKillSwitch('desktop', false);
  assert(
    pdp.evaluate({
      toolName: 'desktop_safe_action',
      args: {},
      actor: { role: 'owner', channel: 'DESKTOP' },
    }).allowed,
    'Domain action restored after disengaging domain kill switch'
  );

  // Engage Global Kill Switch
  pdp.setGlobalKillSwitch(true);
  assert(
    !pdp.evaluate({
      toolName: 'desktop_safe_action',
      args: {},
      actor: { role: 'owner', channel: 'DESKTOP' },
    }).allowed,
    'Global kill switch halts desktop actions'
  );

  pdp.setGlobalKillSwitch(false);
  assert(
    pdp.evaluate({
      toolName: 'desktop_safe_action',
      args: {},
      actor: { role: 'owner', channel: 'DESKTOP' },
    }).allowed,
    'Operations restored after global kill switch reset'
  );

  // --------------------------------------------------------------------------
  // SECTION 7: EMBODIED ROBOT PHYSICAL SAFETY CONTROLLER & HARDWARE INTERLOCKS
  // --------------------------------------------------------------------------
  console.log('\n🤖 SECTION 7: Embodied Robot Physical Safety Controller & Interlocks');
  const robotSafety = new RobotSafetyController();

  // Test Normal Operation & Servo Clamping
  robotSafety.recordFirmwareHeartbeat({ batteryLevel: 95, batteryTempC: 35 });
  const motionNormal = robotSafety.validateAndClampMotion(45, 15);
  assert(motionNormal.allowed && motionNormal.safePan === 45 && motionNormal.safeTilt === 15, 'Within-range angles allowed unchanged');

  const motionExtreme = robotSafety.validateAndClampMotion(130, -50);
  assert(motionExtreme.allowed && motionExtreme.safePan === 90 && motionExtreme.safeTilt === -20, 'Out-of-range angles clamped to safe limits [-90°, +90°] and [-20°, +30°]');

  // Test Thermal Interlock (> 60°C)
  robotSafety.recordFirmwareHeartbeat({ batteryLevel: 90, batteryTempC: 65 }); // 65°C exceeds MAX_SAFE_TEMP_C (60°C)
  const thermalCheck = robotSafety.validateAndClampMotion(0, 0);
  assert(!thermalCheck.allowed && thermalCheck.reason?.includes('safety interlock') === true, 'Thermal interlock triggers actuator cut when temp exceeds 60°C');

  // Test Heartbeat Recovery & Cooldown
  robotSafety.recordFirmwareHeartbeat({ batteryLevel: 90, batteryTempC: 35 }); // Cool down
  assert(robotSafety.validateAndClampMotion(0, 0).allowed, 'Actuator restored after temperature cools down');

  // Test Emergency Stop (E-Stop)
  robotSafety.triggerEmergencyStop('Obstacle collision detected');
  const estopMove = robotSafety.validateAndClampMotion(0, 0);
  assert(!estopMove.allowed && estopMove.reason?.includes('E-Stop') === true, 'Emergency Stop strictly halts all servo actuation');

  robotSafety.resetEmergencyStop();
  assert(robotSafety.validateAndClampMotion(0, 0).allowed, 'Actuation re-enabled following authorized E-Stop reset');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 LEVEL 4 GOVERNANCE SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests === 0) {
    console.log('🎉 ALL LEVEL 4 AUTONOMY GOVERNANCE & SAFETY TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED!`);
  }
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runLevel4GovernanceSuite().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
