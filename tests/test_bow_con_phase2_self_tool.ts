// tests/test_bow_con_phase2_self_tool.ts
// BOW CON V4.0 — PHASE 2: AUTONOMOUS DYNAMIC SKILLS & HYBRID DUAL-BRAIN TEST SUITE

import {
  globalSkillManager,
  globalSandboxRunner,
  globalHybridRouter,
  toolRegistry,
} from '../src/index.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runPhase2Suite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING BOW CON V4.0 (PHASE 2: SELF-TOOL SYNTHESIS & HYBRID BRAIN) SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: SANDBOX SYNTAX VALIDATION & SAFETY GUARDS
  // --------------------------------------------------------------------------
  console.log('🛡️ SECTION 1: Sandbox Syntax Validation & Safety Guards');

  const validCode = 'const x = args.a + args.b; return { sum: x };';
  const syntaxValid = globalSandboxRunner.validateSyntax(validCode);
  assert(syntaxValid.valid === true, 'Valid code syntax passes check');

  const invalidCode = 'const x = ; return { sum: x };';
  const syntaxInvalid = globalSandboxRunner.validateSyntax(invalidCode);
  assert(syntaxInvalid.valid === false, 'Invalid syntax caught by validator');
  assert(Boolean(syntaxInvalid.error), 'Syntax error details returned');

  // Test execution in sandbox
  const execResult = await globalSandboxRunner.executeInSandbox(validCode, { a: 15, b: 35 });
  assert(execResult.success === true, 'Sandbox executed valid code successfully');
  assert(execResult.output?.sum === 50, 'Output calculation is accurate (15 + 35 = 50)');
  assert(execResult.executionTimeMs >= 0, 'Execution time tracked in ms');

  // --------------------------------------------------------------------------
  // SECTION 2: AUTONOMOUS SKILL SYNTHESIS & SELF-DEBUGGING
  // --------------------------------------------------------------------------
  console.log('\n🔧 SECTION 2: Autonomous Skill Synthesis & Self-Debugging');

  // 1. Test failing synthesis (broken runtime code)
  const brokenDraft = {
    id: 'skill_broken_test',
    name: 'Broken Skill Test',
    description: 'Code with runtime exception',
    code: 'throw new Error("Lỗi giả lập để kiểm tra AI tự debug");',
  };
  const failSynthesis = await globalSandboxRunner.testAndSynthesizeSkill(brokenDraft);
  assert(failSynthesis.success === false, 'Broken draft rejected by synthesis gate');
  assert(failSynthesis.debugFeedback?.includes('Lỗi giả lập'), 'Debug feedback captures exact runtime error');

  // 2. Test successful synthesis (hardware power calculator for Boss)
  const powerCalcCode = `
    const voltage = Number(args.voltage) || 5;
    const current = Number(args.current) || 1.5;
    const powerWatts = voltage * current;
    const batteryMah = Number(args.batteryMah) || 3000;
    const estimatedHours = (batteryMah / (current * 1000)).toFixed(1);
    return {
      voltage: voltage + "V",
      current: current + "A",
      powerWatts: powerWatts + "W",
      estimatedBatteryLifeHours: estimatedHours + " giờ",
      status: powerWatts > 15 ? "High Power" : "Safe Standard"
    };
  `;

  const validDraft = {
    id: 'skill_robot_power_calc',
    name: 'Tính Công Suất Nguồn Robot ESP32',
    description: 'Tự động tính toán công suất tiêu thụ điện và thời lượng pin cho robot của Sếp.',
    code: powerCalcCode,
    testArgs: { voltage: 5, current: 2, batteryMah: 4000 },
    parametersSchema: {
      voltage: { type: 'number', description: 'Điện áp (V)' },
      current: { type: 'number', description: 'Dòng điện (A)' },
      batteryMah: { type: 'number', description: 'Dung lượng pin (mAh)' },
    },
  };

  const successSynthesis = await globalSandboxRunner.testAndSynthesizeSkill(validDraft);
  assert(successSynthesis.success === true, 'Skill synthesized successfully');
  assert(Boolean(successSynthesis.synthesizedSkill), 'DynamicSkill object created');
  assert(successSynthesis.debugFeedback?.includes('thành công'), 'Positive debug feedback message');

  // --------------------------------------------------------------------------
  // SECTION 3: LIVE HOT-REGISTRATION TO TOOL REGISTRY
  // --------------------------------------------------------------------------
  console.log('\n⚡ SECTION 3: Live Hot-Registration to Tool Registry');

  const registeredTool = toolRegistry.getTool('skill_robot_power_calc');
  assert(Boolean(registeredTool), 'Synthesized skill immediately registered into global toolRegistry');
  assert(registeredTool?.description.includes('[DYNAMIC SKILL]'), 'Tool description marked as dynamic');

  // Execute the newly created tool directly via toolRegistry
  const toolExecResult: any = await registeredTool!.execute({ voltage: 12, current: 3, batteryMah: 6000 });
  assert(toolExecResult.success === true, 'Tool executed via toolRegistry directly');
  assert(toolExecResult.result?.powerWatts === '36W', 'Calculated 12V * 3A = 36W correctly');
  assert(toolExecResult.result?.status === 'High Power', 'Status classified as High Power');

  // --------------------------------------------------------------------------
  // SECTION 4: DYNAMIC SKILL MANAGER & TELEMETRY
  // --------------------------------------------------------------------------
  console.log('\n📊 SECTION 4: Dynamic Skill Manager & Telemetry');

  const retrievedSkill = globalSkillManager.getSkill('skill_robot_power_calc');
  assert(Boolean(retrievedSkill), 'Retrieved skill from DynamicSkillManager');
  assert((retrievedSkill?.executionCount || 0) >= 1, 'Skill execution count tracked');
  assert(retrievedSkill?.lastExecutionSuccess === true, 'lastExecutionSuccess is true');

  const allSkills = globalSkillManager.listSkills();
  assert(allSkills.length >= 1, 'listSkills returns all registered skills');

  // --------------------------------------------------------------------------
  // SECTION 5: HYBRID DUAL-BRAIN MODEL ROUTER
  // --------------------------------------------------------------------------
  console.log('\n🧠 SECTION 5: Hybrid Dual-Brain Model Router');

  const routerStatus = globalHybridRouter.getStatus();
  assert(Boolean(routerStatus.activeMode), 'Router status returns activeMode');

  // Test mode switching
  globalHybridRouter.setMode('deterministic_only');
  assert(globalHybridRouter.getStatus().activeMode === 'deterministic_only', 'Switched mode to deterministic_only');

  globalHybridRouter.setMode('auto');
  assert(globalHybridRouter.getStatus().activeMode === 'auto', 'Restored mode to auto');

  // Test Auto-Fallback simulation
  // Cloud caller that simulates failure
  const failingCloudCaller = async () => {
    throw new Error('503: The model API is currently overloaded. Please try again later.');
  };

  // Deterministic fallback caller
  const deterministicCaller = async (text: string) => {
    return {
      id: 'fallback_msg_' + Date.now(),
      sender: 'agent' as const,
      content: 'Báo cáo Ngài, tôi là BOWCON (Fallback Mode). Hệ thống đã tự động chuyển mạch và sẵn sàng phục vụ Ngài!',
      timestamp: new Date().toISOString(),
      data: { source: 'deterministic_fallback' },
    };
  };

  const routedResponse = await globalHybridRouter.routeMessage(
    'Kiểm tra tình hình shop hôm nay',
    { role: 'owner', channel: 'ROBOT' },
    failingCloudCaller,
    deterministicCaller
  );

  assert(Boolean(routedResponse.content), 'Router returned fallback response when Cloud failed');
  assert(routedResponse.content.includes('BOWCON'), 'Fallback response preserves BOWCON identity');
  assert(globalHybridRouter.getStatus().totalFallbackEvents >= 1, 'Fallback event count recorded in telemetry');

  // --------------------------------------------------------------------------
  // SECTION 6: PHASE 2 TOOLS IN TOOL REGISTRY
  // --------------------------------------------------------------------------
  console.log('\n🔧 SECTION 6: Phase 2 Tools in Tool Registry');

  const createSkillTool = toolRegistry.getTool('create_dynamic_skill');
  const execSkillTool = toolRegistry.getTool('execute_dynamic_skill');
  const listSkillsTool = toolRegistry.getTool('list_dynamic_skills');
  const switchBrainTool = toolRegistry.getTool('switch_ai_brain_mode');

  assert(Boolean(createSkillTool), 'create_dynamic_skill tool is registered');
  assert(Boolean(execSkillTool), 'execute_dynamic_skill tool is registered');
  assert(Boolean(listSkillsTool), 'list_dynamic_skills tool is registered');
  assert(Boolean(switchBrainTool), 'switch_ai_brain_mode tool is registered');

  // Execute list skills tool
  const listRes = await listSkillsTool!.execute({}, { role: 'owner', channel: 'ROBOT' });
  assert(listRes.success === true, 'list_dynamic_skills executed successfully');
  assert(Array.isArray(listRes.payload), 'list_dynamic_skills returns array of skills');

  // Execute switch brain tool
  const switchRes = await switchBrainTool!.execute({ mode: 'auto' }, { role: 'owner', channel: 'ROBOT' });
  assert(switchRes.success === true, 'switch_ai_brain_mode executed successfully');
  assert(switchRes.payload?.activeMode === 'auto', 'Brain mode confirms auto');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 PHASE 2 SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests === 0) {
    console.log('🎉 ALL PHASE 2 SELF-TOOL SYNTHESIS & HYBRID BRAIN TESTS PASSED (100%)!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED!`);
  }
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase2Suite().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
