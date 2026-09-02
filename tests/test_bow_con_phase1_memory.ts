// tests/test_bow_con_phase1_memory.ts
// BOW CON V4.0 — PHASE 1: EPISODIC BOSS MEMORY & LIFE COMPANION TEST SUITE

import {
  globalBossMemory,
  globalBossFeedback,
  globalNightlyHunter,
  globalMorningBriefing,
  toolRegistry,
  processAgentMessage,
  BOW_CON_SYSTEM_PROMPT,
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

async function runPhase1Suite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING BOW CON V4.0 (PHASE 1: BOSS MEMORY & MORNING BRIEFING) SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: BOSS MEMORY HUB & EPISODIC RECALL
  // --------------------------------------------------------------------------
  console.log('🧠 SECTION 1: Boss Memory Hub & Episodic Recall');

  const profile = globalBossMemory.getProfile();
  assert(Boolean(profile.name), 'Boss profile has name configured');
  assert(Boolean(profile.habits), 'Boss habits object initialized');
  assert(profile.projects.length >= 1, 'Boss has active projects configured');

  // Test updating habit
  globalBossMemory.rememberHabit('preferredBeverage', 'Cà phê đen ít đường lúc 8:00 sáng');
  const updatedProfile = globalBossMemory.getProfile();
  assert(updatedProfile.habits.preferredBeverage?.includes('Cà phê đen ít đường'), 'Preferred beverage updated and persisted');

  // Test adding new project
  const newProj = globalBossMemory.addOrUpdateProject({
    id: 'proj_esp32_quadruped',
    name: 'Robot Bốn Chân ESP32',
    description: 'Chế tạo robot 4 chân tự hành cân bằng động.',
    techStack: ['ESP32', 'FreeRTOS', 'C++'],
    status: 'active',
  });
  assert(newProj.name === 'Robot Bốn Chân ESP32', 'New research project added');
  assert(globalBossMemory.getProfile().projects.some(p => p.id === 'proj_esp32_quadruped'), 'Project exists in active profile');

  // Test text extraction heuristics
  const extractHabit = globalBossMemory.extractFactFromText('Anh thường thích uống sinh tố bơ vào buổi chiều nhé');
  assert(extractHabit.extracted === true, 'Extracted beverage habit from conversational text');
  assert(extractHabit.category === 'habits', 'Correctly categorized as habits');

  const extractProj = globalBossMemory.extractFactFromText('Con ơi anh đang làm dự án Mạng nơ-ron cục bộ trên chip vi xử lý nhé');
  assert(extractProj.extracted === true, 'Extracted project fact from conversational text');
  assert(extractProj.category === 'projects', 'Correctly categorized as projects');

  // Test Prompt Context generation
  const promptCtx = globalBossMemory.getPromptContext();
  assert(promptCtx.includes('HỒ SƠ & TRÍ NHỚ VỀ SẾP'), 'Prompt context header generated');
  assert(promptCtx.includes('Robot Bốn Chân ESP32'), 'Active project included in prompt context');

  // --------------------------------------------------------------------------
  // SECTION 2: BOSS FEEDBACK LEARNER (REINFORCEMENT & SELF-CORRECTION)
  // --------------------------------------------------------------------------
  console.log('\n🎯 SECTION 2: Boss Feedback Learner (Self-Correction & Rules)');

  const rules = globalBossFeedback.getRules();
  assert(rules.length >= 1, 'Initial default boss rules loaded');

  // Test detecting addressing correction
  const addressCorrection = globalBossFeedback.detectCorrectionPattern('Từ nay hãy xưng là Con với anh nhé');
  assert(addressCorrection.isCorrection === true, 'Detected addressing correction pattern');
  assert(addressCorrection.replyMessage?.includes('xưng là "Tôi"'), 'Generated respectful acknowledgement reply');

  // Test detecting policy rule
  const policyCorrection = globalBossFeedback.detectCorrectionPattern('Nhớ là bảo hành 1 đổi 1 trong vòng 30 ngày nhé');
  assert(policyCorrection.isCorrection === true, 'Detected policy correction pattern');
  assert(policyCorrection.learnedRule?.category === 'policy', 'Categorized as policy rule');

  // Test prompt injection
  const rulesPrompt = globalBossFeedback.getPromptInjections();
  assert(rulesPrompt.includes('QUY TẮC BẮT BUỘC DO SẾP DẠY'), 'Rules prompt header generated');

  // --------------------------------------------------------------------------
  // SECTION 3: NIGHTLY HUNTER DAEMON (2:00 AM AUTONOMOUS SCAN)
  // --------------------------------------------------------------------------
  console.log('\n🌙 SECTION 3: Nightly Hunter Daemon (2:00 AM Autonomous Scan)');

  const digest = await globalNightlyHunter.runNightlyHunterJob();
  assert(Boolean(digest.generatedAt), 'Morning digest generated timestamp exists');
  assert(digest.techNews.length >= 2, 'Tech news collected for Boss projects');
  assert(Boolean(digest.shopExecutiveSummary), 'Shop executive summary aggregated');
  assert(digest.recommendedActionsForToday.length >= 1, 'Recommended actions generated');

  const cachedDigest = globalNightlyHunter.getLatestDigest();
  assert(Boolean(cachedDigest), 'Digest persisted to disk and readable');
  assert(cachedDigest?.targetDate === digest.targetDate, 'Persisted targetDate matches');

  // --------------------------------------------------------------------------
  // SECTION 4: MORNING BRIEFING SERVICE & EMBODIED REFLEXES
  // --------------------------------------------------------------------------
  console.log('\n🌅 SECTION 4: Morning Briefing Service & Embodied Reflexes');

  const briefing = await globalMorningBriefing.executeMorningBriefing();
  assert(Boolean(briefing.speechText), 'Speech text generated');
  assert(briefing.speechText.includes('BOWCON'), 'Speech references BOWCON persona');
  assert(briefing.robotActions.deskLightStatus === 'on', 'Smart Home desk light triggered');
  assert(briefing.robotActions.eyesEmotion === 'happy', 'OLED eyes set to happy');

  // --------------------------------------------------------------------------
  // SECTION 5: TOOL REGISTRY VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n🔧 SECTION 5: Tool Registry Verification');

  const rememberTool = toolRegistry.getTool('boss_remember_fact');
  const recallTool = toolRegistry.getTool('boss_recall_memory');
  const briefingTool = toolRegistry.getTool('get_morning_briefing');
  const teachTool = toolRegistry.getTool('teach_boss_rule');

  assert(Boolean(rememberTool), 'boss_remember_fact tool is registered');
  assert(Boolean(recallTool), 'boss_recall_memory tool is registered');
  assert(Boolean(briefingTool), 'get_morning_briefing tool is registered');
  assert(Boolean(teachTool), 'teach_boss_rule tool is registered');

  // Execute remember tool directly
  const rememberRes = await rememberTool!.execute(
    { category: 'habits', key: 'favoriteMusicGenre', value: 'Nhạc Lofi Piano thư giãn' },
    { role: 'owner', channel: 'ROBOT' }
  );
  assert(rememberRes.success === true, 'boss_remember_fact tool executed successfully');

  // Execute recall tool directly
  const recallRes = await recallTool!.execute({}, { role: 'owner', channel: 'ROBOT' });
  assert(recallRes.success === true, 'boss_recall_memory tool executed successfully');
  assert(Boolean(recallRes.payload?.habits), 'boss_recall_memory returns habits');

  // --------------------------------------------------------------------------
  // SECTION 6: END-TO-END CONVERSATIONAL DISPATCHING (BOW CON PERSONA)
  // --------------------------------------------------------------------------
  console.log('\n🤖 SECTION 6: End-to-End Conversational Dispatching (BOW Con Persona)');

  const bossContext = {
    userId: 'boss_hoan',
    role: 'owner' as const,
    channel: 'ROBOT' as const,
    isAuthenticated: true,
  };

  // 1. Morning briefing query
  const res1 = await processAgentMessage('Chào buổi sáng con nhé, đọc bản tin sáng cho anh', bossContext);
  assert(res1.data?.type === 'morning_briefing', 'Routed to morning_briefing intent');
  assert(res1.content.includes('BOWCON'), 'Agent identifies as BOWCON');

  // 2. Recall beverage query
  const res2 = await processAgentMessage('Anh thích uống gì nhỉ?', bossContext);
  assert(res2.data?.type === 'boss_memory_recalled', 'Routed to boss_memory_recalled intent');
  assert(res2.content.toLowerCase().includes('uống'), 'Content mentions drink preferences');

  // 3. Recall project query
  const res3 = await processAgentMessage('Anh đang làm dự án gì nhỉ?', bossContext);
  assert(res3.data?.type === 'boss_memory_recalled', 'Routed to boss_memory_recalled intent for projects');
  assert(res3.content.includes('Robot'), 'Content mentions active robotics projects');

  // 4. Teach rule query
  const res4 = await processAgentMessage('Từ nay hãy xưng là Con với anh nhé', bossContext);
  assert(res4.data?.type === 'boss_rule_learned', 'Routed to boss_rule_learned intent');
  assert(res4.content.includes('Tôi') && res4.content.includes('Ngài'), 'Agent acknowledges addressing rule with Tôi and Ngài');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 PHASE 1 SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests === 0) {
    console.log('🎉 ALL PHASE 1 BOW CON CAPABILITY TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED!`);
  }
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase1Suite().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
