// tests/test_screen_vision_v3_5.ts
// BOW AGENT V3.5 — SCREEN VISION ASSISTANT & V2 FAST-PATH TEST SUITE

import {
  // Fast Path & Core
  fastPathRouter,
  
  // Tools & Vision
  toolRegistry,
  screenVisionService,
  executeGeminiTool,
  
  // Speech Hub
  ttsEngine,
  
  // Prompts
  BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT,
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

async function runScreenVisionSuite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING BOW AGENT V3.5 SCREEN VISION & FAST-PATH TEST SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: V2 DETERMINISTIC FAST-PATH ROUTER (0ms LOCAL CPU ENGINE)
  // --------------------------------------------------------------------------
  console.log('⚡ SECTION 1: V2 Deterministic Fast-Path Router (0ms Local Execution)');

  // 1a. Launch Chrome
  const chromeRes = fastPathRouter.evaluate('Mở Google Chrome');
  assert(chromeRes.matched === true, 'Fast-path recognizes "Mở Google Chrome"');
  assert(chromeRes.action === 'desktop_launch_app', 'Action mapped to desktop_launch_app');
  assert(chromeRes.target === 'chrome', 'Target executable is chrome');
  assert(typeof chromeRes.executionDurationMs === 'number' && chromeRes.executionDurationMs < 10, 'Executed locally in < 10ms (Actual: ' + chromeRes.executionDurationMs + 'ms)');

  // 1b. Launch Notepad
  const notepadRes = fastPathRouter.evaluate('bật notepad');
  assert(notepadRes.matched === true, 'Fast-path recognizes "bật notepad"');
  assert(notepadRes.target === 'notepad', 'Target executable is notepad');

  // 1c. Launch Calculator
  const calcRes = fastPathRouter.evaluate('mở máy tính');
  assert(calcRes.matched === true, 'Fast-path recognizes "mở máy tính" as calculator');
  assert(calcRes.target === 'calc', 'Target executable is calc');

  // 1d. Screenshot
  const shotRes = fastPathRouter.evaluate('chụp màn hình');
  assert(shotRes.matched === true, 'Fast-path recognizes "chụp màn hình"');
  assert(shotRes.action === 'desktop_capture_screenshot', 'Action mapped to desktop_capture_screenshot');

  // 1e. Time query
  const timeRes = fastPathRouter.evaluate('Mấy giờ rồi em?');
  assert(timeRes.matched === true, 'Fast-path recognizes time query');
  assert(timeRes.intent === 'UTILITY_TIME', 'Intent is UTILITY_TIME');
  assert(typeof timeRes.textResponse === 'string' && timeRes.textResponse.includes('bây giờ là'), 'Returns current time string');

  // 1f. Greeting
  const greetRes = fastPathRouter.evaluate('chào em');
  assert(greetRes.matched === true, 'Fast-path recognizes instant greeting');
  assert(greetRes.intent === 'GREETING_FAST', 'Intent is GREETING_FAST');

  // 1g. Complex queries bypass fast-path to LLM
  const complexRes = fastPathRouter.evaluate('Xem hộ anh ai vừa nhắn tin trên Facebook và họ nhắn gì thế em');
  assert(complexRes.matched === false, 'Complex vision request bypasses fast-path to LLM');
  assert(complexRes.intent === 'NONE', 'Intent is marked as NONE for LLM reasoning');

  // --------------------------------------------------------------------------
  // SECTION 2: TOOL REGISTRY & RBAC FOR SCREEN NOTIFICATIONS
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 2: RBAC Security Guard for Screen Vision');

  const visionTool = toolRegistry.getTool('inspect_screen_notifications');
  assert(Boolean(visionTool), 'inspect_screen_notifications tool is registered in toolRegistry');

  // 2a. Reject customer
  const unauthRes = await visionTool!.execute({}, {
    role: 'customer',
    channel: 'WEB',
    isAuthenticated: true,
  });
  assert(unauthRes.success === false, 'Customer cannot access inspect_screen_notifications');
  assert(unauthRes.error?.includes('FORBIDDEN_ACCESS') === true, 'Returns FORBIDDEN_ACCESS error to customer');

  // 2b. Authorize Owner
  const authRes = await visionTool!.execute({ focusApp: 'Facebook' }, {
    role: 'owner',
    channel: 'ROBOT',
    isAuthenticated: true,
  });
  assert(authRes.success === true, 'Owner executes inspect_screen_notifications successfully');
  assert(authRes.action === 'inspect_screen_notifications', 'Action name is preserved');
  assert(typeof authRes.message === 'string' && authRes.message.length > 0, 'Returns readable notification message');

  // --------------------------------------------------------------------------
  // SECTION 3: SCREEN VISION EXTRACTION & MESSAGING APP DETECTION
  // --------------------------------------------------------------------------
  console.log('\n👁️ SECTION 3: Screen Vision Extraction & Messaging App Detection');

  const visionResult = await screenVisionService.inspectScreenForNotifications({
    userQuery: 'Ai vừa nhắn tin Facebook cho tôi?',
    focusApp: 'Facebook',
  });

  assert(visionResult.success === true, 'Screen vision service returned success');
  assert(visionResult.detectedApp === 'Facebook', 'Detected app is Facebook');
  assert(visionResult.senderName === 'Tuấn Anh', 'Extracted sender name is Tuấn Anh');
  assert(visionResult.messageText?.includes('Tối nay 8h rảnh không') === true, 'Extracted message text correctly');
  assert(visionResult.summary.includes('Tuấn Anh') && visionResult.summary.includes('Facebook'), 'Summary format mentions sender and app');
  assert(typeof visionResult.recommendedReply === 'string', 'Provides recommended reply for voice interaction');

  // --------------------------------------------------------------------------
  // SECTION 4: GEMINI TOOL EXECUTION BRIDGE & PROMPT INSTRUCTION
  // --------------------------------------------------------------------------
  console.log('\n🧠 SECTION 4: Gemini Tool Bridge & Executive Prompt Directives');

  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('inspect_screen_notifications'), 'Executive prompt instructs calling inspect_screen_notifications');
  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('MẮT THẦN MÀN HÌNH'), 'Executive prompt defines Screen Vision Assistant role');

  const bridgeRes = await executeGeminiTool(
    'inspect_screen_notifications',
    { userQuery: 'Xem ai vừa nhắn tin Facebook' },
    { role: 'owner', channel: 'ROBOT', isAuthenticated: true }
  );

  assert(bridgeRes.success === true, 'Gemini bridge executes inspect_screen_notifications for Boss');
  assert(bridgeRes.toolName === 'inspect_screen_notifications', 'Tool name matched');
  assert(bridgeRes.data?.detectedApp === 'Facebook', 'Payload contains detectedApp');
  assert(bridgeRes.data?.senderName === 'Tuấn Anh', 'Payload contains senderName');

  // --------------------------------------------------------------------------
  // SECTION 5: VOICE SYNTHESIS FOR SCREEN BRIEFING
  // --------------------------------------------------------------------------
  console.log('\n🎙️ SECTION 5: Robot Voice Synthesis for Screen Briefing');

  const spokenText = `Dạ Sếp, bạn ${visionResult.senderName} vừa nhắn tin trên Facebook: "${visionResult.messageText}". Sếp có muốn em nhắn tin trả lời lại không ạ?`;
  const ttsResult = await ttsEngine.synthesize(spokenText, { voice: 'vi-VN-HoaiMyNeural' });

  assert(ttsResult.success === true, 'TTS synthesis executed successfully for screen briefing');
  assert(ttsResult.voice === 'vi-VN-HoaiMyNeural', 'TTS used female Vietnamese neural voice');
  assert(ttsResult.format === 'mp3', 'Audio synthesized in MP3 format');


  // --------------------------------------------------------------------------
  // TEST REPORT SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 SCREEN VISION SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🌟 ALL SECTIONS (1-5) PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runScreenVisionSuite().catch((err) => {
  console.error('Fatal error running screen vision suite:', err);
  process.exit(1);
});
