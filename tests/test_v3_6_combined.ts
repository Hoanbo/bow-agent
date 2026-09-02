// tests/test_v3_6_combined.ts
// BOW AGENT V3.6 — COMBINED TEST SUITE: VOICE REPLY LOOP & UNIVERSAL CODE INTERPRETER

import {
  // Services
  chatReplyService,
  codeSandboxService,
  
  // Tools & Gemini Bridge
  toolRegistry,
  executeGeminiTool,
  
  // Speech & Prompt
  ttsEngine,
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

async function runCombinedSuite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING BOW AGENT V3.6 COMBINED: VOICE REPLY & CODE INTERPRETER SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: VOICE-TO-CHAT REPLY SERVICE
  // --------------------------------------------------------------------------
  console.log('💬 SECTION 1: Voice-to-Chat Reply Service (Facebook/Zalo/Telegram)');

  // 1a. Successful reply dispatch
  const replyRes = await chatReplyService.sendChatReply({
    replyText: 'Tối nay anh bận họp rồi, để mai cafe nhé ông',
    targetApp: 'Facebook',
    recipientName: 'Tuấn Anh',
  });
  assert(replyRes.success === true, 'Chat reply executed successfully');
  assert(replyRes.targetApp === 'Facebook', 'Target app preserved as Facebook');
  assert(replyRes.recipientName === 'Tuấn Anh', 'Recipient name preserved');
  assert(replyRes.message.includes('Tuấn Anh') && replyRes.message.includes('Facebook'), 'Message provides human-friendly confirmation');

  // 1b. Reject empty message
  const emptyReply = await chatReplyService.sendChatReply({ replyText: '   ' });
  assert(emptyReply.success === false, 'Rejects empty reply text');
  assert(emptyReply.message.includes('LỖI'), 'Returns error message for empty text');

  // --------------------------------------------------------------------------
  // SECTION 2: TOOL REGISTRY & RBAC FOR CHAT REPLY
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 2: RBAC Security Guard for Chat Reply Tool');

  const replyTool = toolRegistry.getTool('desktop_reply_message');
  assert(Boolean(replyTool), 'desktop_reply_message tool is registered in toolRegistry');

  // 2a. Reject customer
  const unauthReply = await replyTool!.execute({ replyText: 'Test spam' }, {
    role: 'customer',
    channel: 'WEB',
    isAuthenticated: true,
  });
  assert(unauthReply.success === false, 'Customer cannot access desktop_reply_message');
  assert(unauthReply.error?.includes('FORBIDDEN_ACCESS') === true, 'Returns FORBIDDEN_ACCESS error to customer');

  // 2b. Authorize Owner
  const authReply = await replyTool!.execute({
    replyText: 'Dạ anh đang về rồi nhé',
    targetApp: 'Zalo',
    recipientName: 'Vợ',
  }, {
    role: 'owner',
    channel: 'ROBOT',
    isAuthenticated: true,
  });
  assert(authReply.success === true, 'Owner executes desktop_reply_message successfully');
  assert(authReply.action === 'desktop_reply_message', 'Action name is preserved');
  assert(typeof authReply.message === 'string' && authReply.message.includes('Vợ'), 'Returns confirmation mentioning recipient');

  // --------------------------------------------------------------------------
  // SECTION 3: UNIVERSAL CODE INTERPRETER SANDBOX SERVICE
  // --------------------------------------------------------------------------
  console.log('\n💻 SECTION 3: Universal Code Interpreter Sandbox (Dynamic Code Execution)');

  // 3a. Mathematical calculation
  const mathCode = `
    const numbers = [15, 25, 35, 45, 80];
    const total = numbers.reduce((sum, n) => sum + n, 0);
    const avg = total / numbers.length;
    return { total, avg };
  `;
  const mathRes = await codeSandboxService.executeCode({ code: mathCode });
  assert(mathRes.success === true, 'Code sandbox executed math reduction script');
  assert(mathRes.result?.total === 200, 'Calculated total is 200 (Actual: ' + mathRes.result?.total + ')');
  assert(mathRes.result?.avg === 40, 'Calculated average is 40 (Actual: ' + mathRes.result?.avg + ')');
  assert(typeof mathRes.executionTimeMs === 'number' && mathRes.executionTimeMs < 100, 'Executed in < 100ms (Actual: ' + mathRes.executionTimeMs + 'ms)');

  // 3b. Complex data filtering & transformation (No hardcoded tool required!)
  const filterCode = `
    const orders = [
      { id: 'ORD_1', product: 'Canva Pro', revenue: 150000, daysAgo: 2 },
      { id: 'ORD_2', product: 'YouTube', revenue: 35000, daysAgo: 35 },
      { id: 'ORD_3', product: 'ChatGPT Plus', revenue: 350000, daysAgo: 5 },
      { id: 'ORD_4', product: 'Netflix', revenue: 90000, daysAgo: 60 },
    ];
    // Ad-hoc query: Get high-value recent customers (revenue >= 100k, within 30 days)
    const filtered = orders.filter(o => o.revenue >= 100000 && o.daysAgo <= 30);
    const summaryRevenue = filtered.reduce((sum, o) => sum + o.revenue, 0);
    return { count: filtered.length, summaryRevenue, products: filtered.map(o => o.product) };
  `;
  const filterRes = await codeSandboxService.executeCode({ code: filterCode });
  assert(filterRes.success === true, 'Code sandbox executed ad-hoc data filtering');
  assert(filterRes.result?.count === 2, 'Found 2 matching high-value orders');
  assert(filterRes.result?.summaryRevenue === 500000, 'Calculated 500.000đ revenue');
  assert(filterRes.result?.products?.includes('Canva Pro') && filterRes.result?.products?.includes('ChatGPT Plus'), 'Products extracted correctly');

  // 3c. Infinite Loop Protection (Timeout Guard)
  const infiniteLoopCode = `
    let i = 0;
    while (true) {
      i++;
    }
  `;
  const loopRes = await codeSandboxService.executeCode({ code: infiniteLoopCode, timeoutMs: 300 });
  assert(loopRes.success === false, 'Sandbox terminates infinite loop safely');
  assert(Boolean(loopRes.error?.includes('timed out') || loopRes.error?.includes('Lỗi')), 'Error indicates execution timeout guard');


  // --------------------------------------------------------------------------
  // SECTION 4: TOOL REGISTRY & RBAC FOR CODE INTERPRETER
  // --------------------------------------------------------------------------
  console.log('\n🛡️ SECTION 4: RBAC Security Guard for Code Interpreter Tool');

  const codeTool = toolRegistry.getTool('desktop_execute_code');
  assert(Boolean(codeTool), 'desktop_execute_code tool is registered in toolRegistry');

  // 4a. Reject customer
  const unauthCode = await codeTool!.execute({ code: 'return 1 + 1;' }, {
    role: 'customer',
    channel: 'WEB',
    isAuthenticated: true,
  });
  assert(unauthCode.success === false, 'Customer cannot access desktop_execute_code');
  assert(unauthCode.error?.includes('FORBIDDEN_ACCESS') === true, 'Returns FORBIDDEN_ACCESS error on code execution');

  // 4b. Authorize Owner
  const authCode = await codeTool!.execute({
    code: 'return Math.sqrt(144) * 10;',
    language: 'javascript',
  }, {
    role: 'owner',
    channel: 'ROBOT',
    isAuthenticated: true,
  });
  assert(authCode.success === true, 'Owner executes desktop_execute_code successfully');
  assert(authCode.payload?.result === 120, 'Sandbox calculation result is 120');

  // --------------------------------------------------------------------------
  // SECTION 5: GEMINI TOOL BRIDGE & EXECUTIVE PROMPT DIRECTIVES
  // --------------------------------------------------------------------------
  console.log('\n🧠 SECTION 5: Gemini Tool Bridge & Executive Directives');

  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('desktop_reply_message'), 'Executive prompt instructs calling desktop_reply_message');
  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('desktop_execute_code'), 'Executive prompt instructs calling desktop_execute_code');
  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('VOICE-TO-CHAT REPLY LOOP'), 'Executive prompt defines Voice Reply role');
  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('UNIVERSAL CODE INTERPRETER'), 'Executive prompt defines Code Interpreter role');

  // 5a. Bridge Reply Message
  const bridgeReply = await executeGeminiTool(
    'desktop_reply_message',
    { replyText: 'Ok tối gặp nhé', targetApp: 'Facebook', recipientName: 'Tuấn Anh' },
    { role: 'owner', channel: 'ROBOT', isAuthenticated: true }
  );
  assert(bridgeReply.success === true, 'Gemini bridge executes desktop_reply_message for Boss');
  assert(bridgeReply.toolName === 'desktop_reply_message', 'Tool name matched');
  assert(bridgeReply.data?.targetApp === 'Facebook', 'Bridge payload preserved targetApp');

  // 5b. Bridge Code Execution
  const bridgeCode = await executeGeminiTool(
    'desktop_execute_code',
    { code: 'return Math.pow(2, 10);', language: 'javascript' },
    { role: 'owner', channel: 'ROBOT', isAuthenticated: true }
  );
  assert(bridgeCode.success === true, 'Gemini bridge executes desktop_execute_code for Boss');
  assert(bridgeCode.data?.result === 1024, 'Code returned 1024 (2^10)');

  // --------------------------------------------------------------------------
  // SECTION 6: ROBOT VOICE CONFIRMATION
  // --------------------------------------------------------------------------
  console.log('\n🎙️ SECTION 6: Robot Voice Confirmation for Actions');

  const voiceConfirmation = 'Dạ Sếp, em đã gửi tin nhắn trả lời cho bạn Tuấn Anh trên Facebook rồi Sếp nhé!';
  const ttsRes = await ttsEngine.synthesize(voiceConfirmation, { voice: 'vi-VN-HoaiMyNeural' });

  assert(ttsRes.success === true, 'TTS synthesis executed successfully');
  assert(ttsRes.format === 'mp3', 'Voice confirmation generated in MP3 format');

  // --------------------------------------------------------------------------
  // TEST REPORT SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 COMBINED SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🌟 ALL SECTIONS (1-6) PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runCombinedSuite().catch((err) => {
  console.error('Fatal error running combined suite:', err);
  process.exit(1);
});
