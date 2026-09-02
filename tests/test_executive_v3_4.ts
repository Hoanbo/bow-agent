// tests/test_executive_v3_4.ts
// BOW AGENT V3.4 — EXECUTIVE ADMIN, DUAL-PERSONA & PROACTIVE ROBOT TEST SUITE

import {
  // Contracts & Adapters
  fallbackShopAdapter,
  setActiveShopAdapter,
  robotChannelAdapter,
  desktopChannelAdapter,
  
  // Tools & Gemini Bridge
  toolRegistry,
  executeGeminiTool,
  
  // Prompts & Engine
  BOW_AGENT_SYSTEM_PROMPT,
  BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT,
} from '../src/index.js';

import { BowCentralAgentServer } from '../src/server.js';


import type { ShopEventPayload } from '../src/contracts/adminProvider.js';
import WebSocket from 'ws';

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

async function runExecutiveSuite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING BOW AGENT V3.4 EXECUTIVE AI & PROACTIVE ROBOT TEST SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: DUAL-PERSONA SYSTEM PROMPTS
  // --------------------------------------------------------------------------
  console.log('🎭 SECTION 1: Dual-Persona System Prompts & Separation');

  assert(typeof BOW_AGENT_SYSTEM_PROMPT === 'string' && BOW_AGENT_SYSTEM_PROMPT.includes('Shop of BOW'), 'Customer System Prompt is established');
  assert(BOW_AGENT_SYSTEM_PROMPT.includes('Xưng hô: **"mình"** hoặc **"BOW"**'), 'Customer prompt enforces polite third-person store tone');
  
  assert(typeof BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT === 'string' && BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('BOW JARVIS'), 'Owner JARVIS Prompt is established');
  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('Xưng hô: **"Em"** — gọi người dùng là **"Sếp"**'), 'JARVIS prompt enforces dedicated Boss assistant tone');
  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('get_sales_report'), 'JARVIS prompt instructs calling get_sales_report');
  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('get_inventory_health'), 'JARVIS prompt instructs calling get_inventory_health');

  // --------------------------------------------------------------------------
  // SECTION 2: RBAC SECURITY & ROLE-BASED ACCESS CONTROL
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 2: RBAC Security Guard for Business Analytics');

  const salesTool = toolRegistry.getTool('get_sales_report');
  assert(Boolean(salesTool), 'get_sales_report tool is registered in toolRegistry');

  // 2a. Reject customer on Web
  const unauthorizedSales = await salesTool!.execute({ timeframe: 'today' }, {
    role: 'customer',
    channel: 'WEB',
    isAuthenticated: false,
  });
  assert(unauthorizedSales.success === false, 'Customer cannot access get_sales_report');
  assert(unauthorizedSales.error?.includes('FORBIDDEN_ACCESS') === true, 'Returns FORBIDDEN_ACCESS error to customer');

  // 2b. Reject customer for inventory
  const inventoryTool = toolRegistry.getTool('get_inventory_health');

  assert(Boolean(inventoryTool), 'get_inventory_health tool is registered in toolRegistry');

  const unauthorizedStock = await inventoryTool!.execute({}, {
    role: 'customer',
    channel: 'WEB',
    isAuthenticated: true,
  });
  assert(unauthorizedStock.success === false, 'Customer cannot access get_inventory_health');
  assert(unauthorizedStock.error?.includes('FORBIDDEN_ACCESS') === true, 'Returns FORBIDDEN_ACCESS error on stock check');

  // 2c. Authorize Owner / Robot
  const authorizedSales = await salesTool!.execute({ timeframe: 'today' }, {
    role: 'owner',
    channel: 'ROBOT',
    isAuthenticated: true,
  });
  assert(authorizedSales.success === true, 'Owner successfully queries get_sales_report');
  assert(authorizedSales.data?.totalRevenue === 2850000, 'Report contains revenue figure (2.850.000đ)');
  assert(authorizedSales.data?.totalOrders === 24, 'Report contains correct order count (24 orders)');
  assert(authorizedSales.data?.topProducts?.length >= 3, 'Report lists top performing products');

  // 2d. Authorize Owner inventory check
  const authorizedStock = await inventoryTool!.execute({}, {
    role: 'owner',
    channel: 'ROBOT',
    isAuthenticated: true,
  });
  assert(authorizedStock.success === true, 'Owner successfully queries get_inventory_health');
  assert(authorizedStock.data?.healthySkus === 6, 'Inventory lists healthy SKUs count');
  assert(authorizedStock.data?.lowStockSkus === 2, 'Inventory correctly detects low stock SKUs');
  assert(authorizedStock.data?.urgentRestockRecommendations?.length > 0, 'Inventory provides restock recommendations');

  // --------------------------------------------------------------------------
  // SECTION 3: GEMINI TOOL EXECUTION BRIDGE
  // --------------------------------------------------------------------------
  console.log('\n🧠 SECTION 3: Gemini Tool Execution Bridge for Analytics');

  // 3a. Bridge Unauthorized
  const bridgeUnauth = await executeGeminiTool(
    'get_sales_report',
    { timeframe: 'this_week' },
    { role: 'customer', channel: 'WEB', isAuthenticated: false }
  );
  assert(bridgeUnauth.success === false, 'Gemini bridge rejects unauthorized call');
  assert(bridgeUnauth.message?.includes('FORBIDDEN_ACCESS') === true, 'Gemini bridge returns forbidden message');

  // 3b. Bridge Authorized
  const bridgeAuth = await executeGeminiTool(
    'get_sales_report',
    { timeframe: 'this_week' },
    { role: 'owner', channel: 'ROBOT', isAuthenticated: true }
  );
  assert(bridgeAuth.success === true, 'Gemini bridge executes get_sales_report for Boss');
  assert(bridgeAuth.actionData?.type === 'sales_report', 'ActionData type assigned as sales_report');
  assert(typeof bridgeAuth.message === 'string' && bridgeAuth.message.includes('2.850.000'), 'Bridge returns human readable message');

  // 3c. Bridge Stock Check
  const bridgeStock = await executeGeminiTool(
    'get_inventory_health',
    {},
    { role: 'owner', channel: 'ROBOT', isAuthenticated: true }
  );
  assert(bridgeStock.success === true, 'Gemini bridge executes get_inventory_health for Boss');
  assert(bridgeStock.actionData?.type === 'inventory_health', 'ActionData type assigned as inventory_health');

  // --------------------------------------------------------------------------
  // SECTION 4: PROACTIVE SHOP-TO-ROBOT EVENT BUS
  // --------------------------------------------------------------------------
  console.log('\n📡 SECTION 4: Proactive Shop-to-Robot Event Bus & Realtime Alerts');

  // 4a. Order Paid Event
  const paidEvent: ShopEventPayload = {
    eventId: 'evt_001',
    type: 'order.paid',
    title: 'Đơn hàng mới',
    description: 'Khách thanh toán gói YouTube 6 tháng',
    amount: 280000,
    productName: 'YouTube Premium 6 tháng',
    urgency: 'medium',
    timestamp: new Date().toISOString(),
  };

  const paidCmd = await robotChannelAdapter.pushShopEventToOwner(paidEvent);
  assert(paidCmd.type === 'robot.proactive_event', 'Command type is robot.proactive_event');
  assert(paidCmd.emotion === 'happy', 'OLED emotion is happy for new revenue');
  assert(paidCmd.text.includes('Sếp ơi! Vừa có đơn hàng mới thành công'), 'Voice alert greets Boss proactively');
  assert(paidCmd.text.includes('280.000 đồng'), 'Voice alert specifies order value');
  assert(paidCmd.tts?.voice === 'vi-VN-HoaiMyNeural', 'TTS synthesized with Vietnamese neural voice');
  assert(typeof paidCmd.servo?.panAngle === 'number' && paidCmd.servo.panAngle > 0, 'Robot pan servo rotates to engage Boss');

  // 4b. Wallet Deposit Event
  const depositEvent: ShopEventPayload = {
    eventId: 'evt_002',
    type: 'wallet.deposit',
    title: 'Nạp tiền ví',
    description: 'Nạp tiền qua VietQR',
    amount: 500000,
    customerName: 'Hoàng Nam',
    urgency: 'low',
    timestamp: new Date().toISOString(),
  };

  const depositCmd = await robotChannelAdapter.pushShopEventToOwner(depositEvent);
  assert(depositCmd.text.includes('Hoàng Nam'), 'Voice alert mentions customer name');
  assert(depositCmd.text.includes('500.000 đồng'), 'Voice alert announces deposited amount');

  // 4c. Low Stock Warning Event
  const stockEvent: ShopEventPayload = {
    eventId: 'evt_003',
    type: 'stock.low',
    title: 'Cảnh báo kho',
    description: 'Netflix 4K sắp hết slot',
    productName: 'Netflix Premium 4K',
    urgency: 'high',
    timestamp: new Date().toISOString(),
  };

  const stockCmd = await robotChannelAdapter.pushShopEventToOwner(stockEvent);
  assert(stockCmd.emotion === 'surprised', 'OLED emotion switches to surprised on stock alert');
  assert(stockCmd.text.includes('Cảnh báo sếp ơi'), 'Voice alert conveys urgency for low stock');

  // 4d. Event Listener Subscription
  let receivedListenerEvent: any = null;
  const unregister = robotChannelAdapter.registerListener((cmd) => {
    receivedListenerEvent = cmd;
  });

  await robotChannelAdapter.pushShopEventToOwner(paidEvent);
  assert(receivedListenerEvent !== null, 'Registered listener receives proactive event');
  assert(receivedListenerEvent.event?.eventId === 'evt_001', 'Listener receives exact event payload');

  unregister();
  receivedListenerEvent = null;
  await robotChannelAdapter.pushShopEventToOwner(paidEvent);
  assert(receivedListenerEvent === null, 'Unregistered listener stops receiving events');

  // --------------------------------------------------------------------------
  // SECTION 5: HTTP REST ENDPOINT & WEBSOCKET REALTIME STREAMING
  // --------------------------------------------------------------------------
  console.log('\n🌐 SECTION 5: HTTP /api/events/shop & WebSocket Gateway Integration');

  const testPort = 4077;
  const testServer = new BowCentralAgentServer({ port: testPort, host: '127.0.0.1' });
  await testServer.start();

  try {
    // 5a. HTTP POST /api/events/shop
    const webhookRes = await fetch(`http://127.0.0.1:${testPort}/api/events/shop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paidEvent),
    });

    assert(webhookRes.status === 200, 'HTTP POST /api/events/shop returns status 200');
    const webhookJson = await webhookRes.json();
    assert(webhookJson.success === true, 'Webhook response indicates success');
    assert(webhookJson.dispatchedToRobot === true, 'Webhook successfully dispatched to robot');
    assert(webhookJson.robotCommand?.emotion === 'happy', 'Webhook returned robot command with happy emotion');

    // 5b. WebSocket Robot Client Receiving Realtime Events
    const wsRobot = new WebSocket(`ws://127.0.0.1:${testPort}/ws/robot`);
    await new Promise<void>((resolve) => wsRobot.on('open', () => resolve()));

    const receivedWsPromise = new Promise<any>((resolve) => {
      wsRobot.on('message', (raw) => {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === 'robot.proactive_event') {
          resolve(parsed);
        }
      });
    });

    // Post an event while Robot WebSocket is connected
    await fetch(`http://127.0.0.1:${testPort}/api/events/shop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stockEvent),
    });

    const receivedWsMsg = await Promise.race([
      receivedWsPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('WebSocket timeout')), 3000)),
    ]);

    assert(receivedWsMsg !== null, 'WebSocket on /ws/robot received proactive event stream');
    assert(receivedWsMsg.type === 'robot.proactive_event', 'WebSocket message has type robot.proactive_event');
    assert(receivedWsMsg.event?.type === 'stock.low', 'WebSocket message contains stock.low event');

    wsRobot.close();
  } finally {
    await testServer.stop();
  }

  // --------------------------------------------------------------------------
  // TEST REPORT SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 EXECUTIVE SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🌟 ALL SECTIONS (1-5) PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runExecutiveSuite().catch((err) => {
  console.error('Fatal error running executive suite:', err);
  process.exit(1);
});
