// tests/test_bow_con_phase3_multiagent.ts
// BOW CON V4.0 — PHASE 3: MULTI-AGENT MESH & EMBODIED REFLEXES TEST SUITE

import {
  globalMultiAgentMesh,
  globalSoundLocalization,
  globalOledEmpathy,
  globalTelegramGateway,
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

async function runPhase3Suite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING BOW CON V4.0 (PHASE 3: MULTI-AGENT MESH & EMBODIED REFLEXES) SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: MULTI-AGENT MESH SUB-AGENT TASK DELEGATION
  // --------------------------------------------------------------------------
  console.log('👥 SECTION 1: Multi-Agent Mesh Sub-Agent Task Delegation');

  // 1. Tech Scout Sub-Agent
  const techTask = await globalMultiAgentMesh.delegateTask('tech_scout', 'Quét tin AI mới nhất cho Sếp');
  assert(techTask.status === 'completed', 'TechScoutAgent completed mission');
  assert(techTask.result?.agent === 'TechScoutAgent', 'Assigned correctly to TechScoutAgent');
  assert(techTask.result?.matchedNewsCount >= 1, 'TechScout found matching tech news');

  // 2. Coder & DevOps Sub-Agent
  const codeTask = await globalMultiAgentMesh.delegateTask('coder_devops', 'Kiểm tra cú pháp code nhúng ESP32', {
    code: 'const baud = 115200; return { baudRate: baud, ready: true };',
  });
  assert(codeTask.status === 'completed', 'CoderDevOpsAgent completed code execution');
  assert(codeTask.result?.output?.ready === true, 'Coder output accurate (baudRate 115200)');

  // 3. Shop Operations Sub-Agent
  const shopTask = await globalMultiAgentMesh.delegateTask('shop_operations', 'Kiểm tra hàng đợi đơn hàng Shop of BOW');
  assert(shopTask.status === 'completed', 'ShopOperationsAgent completed operations audit');
  assert(typeof shopTask.result?.pendingFulfillmentQueue === 'number', 'Tracked pending fulfillment queue');

  // 4. Hardware & Vision Sub-Agent
  const hwTask = await globalMultiAgentMesh.delegateTask('hardware_vision', 'Kiểm tra pin và cảm biến Robot');
  assert(hwTask.status === 'completed', 'HardwareVisionAgent completed hardware telemetry');
  assert(typeof hwTask.result?.batteryPercent === 'number', 'Tracked battery percent');

  // --------------------------------------------------------------------------
  // SECTION 2: TEAM EXECUTIVE REPORT SYNTHESIS
  // --------------------------------------------------------------------------
  console.log('\n📊 SECTION 2: Team Executive Report Synthesis');

  const teamReport = await globalMultiAgentMesh.synthesizeTeamReport();
  assert(Boolean(teamReport.generatedAt), 'Team report generated timestamp exists');
  assert(teamReport.techScoutFindings.includes('Tin nổi bật'), 'Report includes Tech Scout findings');
  assert(teamReport.coderDevOpsStatus.includes('DevOps'), 'Report includes Coder DevOps status');
  assert(teamReport.shopOperationsHealth.includes('Shop'), 'Report includes Shop Operations health');
  assert(teamReport.hardwareVisionStatus.includes('Robot'), 'Report includes Hardware Vision status');

  // --------------------------------------------------------------------------
  // SECTION 3: SOUND LOCALIZATION & HEAD AIMING
  // --------------------------------------------------------------------------
  console.log('\n👂 SECTION 3: Sound Localization & Head Aiming');

  // 1. Sound from Left
  const leftEst = globalSoundLocalization.estimateSoundDirection(90, 10);
  assert(leftEst.sourceDirection === 'left', 'Estimated sound from LEFT direction');
  assert(leftEst.estimatedPanAngle < 0, 'Pan angle is negative (turning left)');

  // 2. Sound from Right
  const rightEst = globalSoundLocalization.estimateSoundDirection(10, 90);
  assert(rightEst.sourceDirection === 'right', 'Estimated sound from RIGHT direction');
  assert(rightEst.estimatedPanAngle > 0, 'Pan angle is positive (turning right)');

  // 3. Sound from Center
  const centerEst = globalSoundLocalization.estimateSoundDirection(50, 50);
  assert(centerEst.sourceDirection === 'center', 'Estimated sound from CENTER direction');
  assert(Math.abs(centerEst.estimatedPanAngle) <= 5, 'Pan angle is near 0 degrees');

  // 4. Aim head action
  const aimResult = await globalSoundLocalization.trackAndAimHeadAtSound(15, 85);
  assert(aimResult.success === true, 'trackAndAimHeadAtSound executed successfully');
  assert(aimResult.direction === 'right', 'Turned head right');
  assert(globalSoundLocalization.getCurrentOrientation().pan > 0, 'Orientation updated in memory');

  // --------------------------------------------------------------------------
  // SECTION 4: ADAPTIVE OLED EMPATHY ENGINE
  // --------------------------------------------------------------------------
  console.log('\n👁️ SECTION 4: Adaptive OLED Empathy Engine');

  // Health / Tired context
  const healthEmotion = globalOledEmpathy.deduceExpressionFromContext('Anh ngồi code đau lưng quá', 'Sếp hãy đứng dậy vươn vai nhé');
  assert(healthEmotion.emotion === 'thinking', 'Emotion adapts to caring/thinking when Boss is tired');

  // Happy greeting context
  const happyEmotion = globalOledEmpathy.deduceExpressionFromContext('Chào buổi sáng con nhé!', 'Dạ con chào Sếp, chúc Sếp ngày mới tốt lành');
  assert(happyEmotion.emotion === 'happy', 'Emotion adapts to happy on morning greeting');
  assert(happyEmotion.intensity === 'vibrant', 'Happy intensity is vibrant');

  // --------------------------------------------------------------------------
  // SECTION 5: MOBILE TELEGRAM VIP GATEWAY
  // --------------------------------------------------------------------------
  console.log('\n📱 SECTION 5: Mobile Telegram VIP Gateway');

  globalTelegramGateway.setAllowedChatId('BOSS_VIP_9999');

  // 1. Authorized message from Boss
  const bossMsg = await globalTelegramGateway.handleIncomingTelegramMessage({
    chatId: 'BOSS_VIP_9999',
    senderName: 'Sếp Hoàn',
    text: 'Chào buổi sáng con, đọc bản tin sáng cho anh',
    isVoiceNote: true,
  });
  assert(bossMsg.delivered === true, 'Boss message delivered and processed');
  assert(bossMsg.replyText.includes('BOWCON'), 'Response comes from BOWCON');
  assert(bossMsg.voiceSynthesized === true, 'Voice note flag processed');

  // 2. Unauthorized stranger message rejected
  const strangerMsg = await globalTelegramGateway.handleIncomingTelegramMessage({
    chatId: 'STRANGER_1234',
    senderName: 'Người Lạ',
    text: 'Cho tôi xem doanh thu shop',
  });
  assert(strangerMsg.delivered === false, 'Stranger access strictly rejected');
  assert(strangerMsg.replyText.includes('CẢNH BÁO AN NINH'), 'Security alert returned to stranger');

  // 3. Push morning briefing to phone
  const pushBriefing = await globalTelegramGateway.pushMorningBriefingToPhone('BOSS_VIP_9999');
  assert(pushBriefing.delivered === true, 'Morning briefing pushed to phone');
  assert(pushBriefing.replyText.includes('BẢN TIN CHÀO BUỔI SÁNG'), 'Briefing formatted for mobile');

  // --------------------------------------------------------------------------
  // SECTION 6: PHASE 3 TOOLS IN TOOL REGISTRY
  // --------------------------------------------------------------------------
  console.log('\n🔧 SECTION 6: Phase 3 Tools in Tool Registry');

  const delegateTool = toolRegistry.getTool('delegate_subagent_task');
  const soundTool = toolRegistry.getTool('robot_track_sound_source');
  const telegramTool = toolRegistry.getTool('send_telegram_briefing_to_boss');

  assert(Boolean(delegateTool), 'delegate_subagent_task tool is registered');
  assert(Boolean(soundTool), 'robot_track_sound_source tool is registered');
  assert(Boolean(telegramTool), 'send_telegram_briefing_to_boss tool is registered');

  // Execute sound tool directly
  const soundToolRes: any = await soundTool!.execute({ micLeftEnergy: 80, micRightEnergy: 20 }, { role: 'owner', channel: 'ROBOT' });
  assert(soundToolRes.success === true, 'robot_track_sound_source executed successfully');

  // Execute telegram tool directly
  const telegramToolRes: any = await telegramTool!.execute({ chatId: 'BOSS_VIP_9999' }, { role: 'owner', channel: 'ROBOT' });
  assert(telegramToolRes.success === true, 'send_telegram_briefing_to_boss executed successfully');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 PHASE 3 SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests === 0) {
    console.log('🎉 ALL PHASE 3 MULTI-AGENT MESH & EMBODIED REFLEXES TESTS PASSED (100%)!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED!`);
  }
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase3Suite().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
