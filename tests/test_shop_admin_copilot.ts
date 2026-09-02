// tests/test_shop_admin_copilot.ts
// BOW AGENT V4.0 — SHOPOFBOW ADMIN AI COPILOT (ON-DEMAND FULFILLMENT MODEL) TEST SUITE

import {
  toolRegistry,
  executeGeminiTool,
  webAdapter,
  BOW_ADMIN_COPILOT_SYSTEM_PROMPT,
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

async function runAdminCopilotSuite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING SHOPOFBOW ADMIN AI COPILOT (ON-DEMAND MODEL) TEST SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: RBAC SECURITY GUARD (CUSTOMER REJECTION)
  // --------------------------------------------------------------------------
  console.log('🔒 SECTION 1: RBAC Security Guard (Customer Rejection)');

  const customerCtx = { role: 'customer' as const, channel: 'WEB' as const, isAuthenticated: true };

  const queueTool = toolRegistry.getTool('get_pending_fulfillment_queue');
  const handoverTool = toolRegistry.getTool('fulfill_order_handover');
  const profitTool = toolRegistry.getTool('get_profit_margin_report');
  const salesTool = toolRegistry.getTool('get_sales_report');
  const voucherTool = toolRegistry.getTool('manage_shop_vouchers');
  const disputeTool = toolRegistry.getTool('inspect_order_dispute');

  assert(Boolean(queueTool), 'get_pending_fulfillment_queue tool is registered');
  assert(Boolean(handoverTool), 'fulfill_order_handover tool is registered');
  assert(Boolean(profitTool), 'get_profit_margin_report tool is registered');
  assert(Boolean(salesTool), 'get_sales_report tool is registered');
  assert(Boolean(voucherTool), 'manage_shop_vouchers tool is registered');
  assert(Boolean(disputeTool), 'inspect_order_dispute tool is registered');

  const custQueueRes = await queueTool!.execute({}, customerCtx);
  assert(custQueueRes.success === false, 'Customer cannot access get_pending_fulfillment_queue');
  assert(Boolean(custQueueRes.error?.includes('FORBIDDEN_ACCESS')), 'Queue returns FORBIDDEN_ACCESS');

  const custHandoverRes = await handoverTool!.execute({ orderId: '123', accountDetails: 'test' }, customerCtx);
  assert(custHandoverRes.success === false, 'Customer cannot access fulfill_order_handover');
  assert(Boolean(custHandoverRes.error?.includes('FORBIDDEN_ACCESS')), 'Handover returns FORBIDDEN_ACCESS');

  const custProfitRes = await profitTool!.execute({}, customerCtx);
  assert(custProfitRes.success === false, 'Customer cannot access get_profit_margin_report');
  assert(Boolean(custProfitRes.error?.includes('FORBIDDEN_ACCESS')), 'Profit report returns FORBIDDEN_ACCESS');

  // --------------------------------------------------------------------------
  // SECTION 2: ON-DEMAND PENDING FULFILLMENT QUEUE INTELLIGENCE
  // --------------------------------------------------------------------------
  console.log('\n⏳ SECTION 2: Pending Fulfillment Queue Intelligence');

  const adminCtx = { role: 'admin' as const, channel: 'WEB' as const, isAuthenticated: true };

  const queueRes = await queueTool!.execute({}, adminCtx);
  assert(queueRes.success === true, 'Admin executes get_pending_fulfillment_queue successfully');
  assert(queueRes.data.totalPendingCount === 3, 'Tracks 3 pending fulfillment orders');
  assert(queueRes.data.urgentCount === 1, 'Flags 1 urgent order waiting > 15 minutes');
  assert(queueRes.data.orders[0].isUrgent === true, 'First order marked as urgent');
  assert(Boolean(queueRes.summary.includes('đơn chờ bàn giao')), 'Summary highlights pending count');

  // --------------------------------------------------------------------------
  // SECTION 3: SMART ONE-CLICK ACCOUNT & KEY HANDOVER ASSISTANT
  // --------------------------------------------------------------------------
  console.log('\n🚀 SECTION 3: Smart One-Click Account & Key Handover Assistant');

  const handoverRes = await handoverTool!.execute({
    orderId: 'BOW-ORD-8812',
    accountDetails: 'user: gpt_plus_pro@bow.vn | pass: Security@2026',
    supplierCost: 320000,
  }, adminCtx);

  assert(handoverRes.success === true, 'Admin executes fulfill_order_handover successfully');
  assert(handoverRes.data.orderId === 'BOW-ORD-8812', 'Preserves order ID');
  assert(handoverRes.data.accountDetails.includes('gpt_plus_pro@bow.vn'), 'Account details attached');
  assert(handoverRes.data.estimatedProfit === 130000, 'Calculated estimated profit (450k - 320k = 130k)');
  assert(Boolean(handoverRes.summary.includes('Trần Minh Đức')), 'Summary confirms customer recipient');

  // --------------------------------------------------------------------------
  // SECTION 4: NET PROFIT & MARGIN REPORT (REVENUE MINUS PROCUREMENT COST)
  // --------------------------------------------------------------------------
  console.log('\n📈 SECTION 4: Net Profit & Margin Report');

  const profitRes = await profitTool!.execute({ timeframe: 'today' }, adminCtx);
  assert(profitRes.success === true, 'Admin executes get_profit_margin_report successfully');
  assert(profitRes.data.totalRevenue === 2850000, 'Tracks total revenue 2.850.000đ');
  assert(profitRes.data.totalSupplierCost === 1650000, 'Tracks total supplier procurement cost 1.650.000đ');
  assert(profitRes.data.netProfit === 1200000, 'Calculates net profit 1.200.000đ');
  assert(profitRes.data.profitMarginPercent === 42.1, 'Calculates profit margin percentage (42.1%)');

  // --------------------------------------------------------------------------
  // SECTION 5: VOUCHER CREATION & DISPUTE RESOLUTION
  // --------------------------------------------------------------------------
  console.log('\n🎟️ SECTION 5: Voucher Creation & Dispute Resolution');

  const voucherRes = await voucherTool!.execute({
    code: 'BOWFLASH30',
    discountPercent: 30,
    minOrderValue: 100000,
  }, adminCtx);
  assert(voucherRes.success === true, 'Admin created voucher BOWFLASH30');
  assert(voucherRes.data.voucher.discountDisplay === '30%', 'Voucher discount is 30%');

  const disputeRes = await disputeTool!.execute({ identifier: 'BOW-ORD-9921' }, adminCtx);
  assert(disputeRes.success === true, 'Admin inspected dispute for BOW-ORD-9921');
  assert(Boolean(disputeRes.data.recommendedAction), 'Dispute provides recommended action');

  // --------------------------------------------------------------------------
  // SECTION 6: GEMINI ADMIN COPILOT PROMPT & BRIDGE EXECUTION
  // --------------------------------------------------------------------------
  console.log('\n🧠 SECTION 6: Gemini Admin Copilot Prompt & Bridge Execution');

  assert(BOW_ADMIN_COPILOT_SYSTEM_PROMPT.includes('ON-DEMAND FULFILLMENT COPILOT'), 'Prompt defines on-demand fulfillment persona');
  assert(BOW_ADMIN_COPILOT_SYSTEM_PROMPT.includes('get_pending_fulfillment_queue'), 'Prompt instructs calling get_pending_fulfillment_queue');
  assert(BOW_ADMIN_COPILOT_SYSTEM_PROMPT.includes('fulfill_order_handover'), 'Prompt instructs calling fulfill_order_handover');
  assert(BOW_ADMIN_COPILOT_SYSTEM_PROMPT.includes('get_profit_margin_report'), 'Prompt instructs calling get_profit_margin_report');

  const bridgeQueueRes = await executeGeminiTool('get_pending_fulfillment_queue', {}, adminCtx);
  assert(bridgeQueueRes.success === true, 'Gemini bridge executes get_pending_fulfillment_queue');
  assert(bridgeQueueRes.actionData?.type === 'pending_fulfillment', 'ActionData type is pending_fulfillment');

  const bridgeHandoverRes = await executeGeminiTool('fulfill_order_handover', {
    orderId: 'BOW-ORD-8815',
    accountDetails: 'canva_invite_link_vip',
  }, adminCtx);
  assert(bridgeHandoverRes.success === true, 'Gemini bridge executes fulfill_order_handover');
  assert(bridgeHandoverRes.actionData?.type === 'order_handover', 'ActionData type is order_handover');

  const bridgeProfitRes = await executeGeminiTool('get_profit_margin_report', { timeframe: 'this_week' }, adminCtx);
  assert(bridgeProfitRes.success === true, 'Gemini bridge executes get_profit_margin_report');
  assert(bridgeProfitRes.actionData?.type === 'profit_margin', 'ActionData type is profit_margin');

  // --------------------------------------------------------------------------
  // SECTION 7: WEBADAPTER INTEGRATION FOR ADMIN DASHBOARD
  // --------------------------------------------------------------------------
  console.log('\n🌐 SECTION 7: WebAdapter Integration for Admin Dashboard');

  const webRes = await webAdapter.handleRequest({
    query: 'Có đơn nào đang chờ anh bàn giao không?',
    context: adminCtx,
  });
  assert(webRes.success === true, 'WebAdapter handled on-demand admin query');
  assert(Boolean(webRes.content || webRes.text), 'Response text is populated');

  // --------------------------------------------------------------------------
  // TEST REPORT SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 ON-DEMAND ADMIN COPILOT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🌟 ALL SECTIONS (1-7) PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runAdminCopilotSuite().catch((err) => {
  console.error('Fatal error running on-demand admin copilot suite:', err);
  process.exit(1);
});
