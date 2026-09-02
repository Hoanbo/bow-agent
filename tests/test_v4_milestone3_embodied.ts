// tests/test_v4_milestone3_embodied.ts
// BOW AGENT V4.0 MILESTONE 3 — EMBODIED PHYSICAL AI, SMART HOME IOT & WATCHDOG TEST SUITE

import http from 'node:http';
import {
  physicalVisionService,
  smartHomeService,
  watchdogDaemon,
  toolRegistry,
  executeGeminiTool,
  BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT,
} from '../src/index.js';
import { BowCentralAgentServer } from '../src/server.js';

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

async function runEmbodiedSuite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING V4.0 MILESTONE 3: EMBODIED PHYSICAL AI & SMART HOME SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: EMBODIED PHYSICAL VISION & BOSS FACE TRACKING
  // --------------------------------------------------------------------------
  console.log('👁️ SECTION 1: Embodied Physical Vision & Boss Face Tracking');

  // 1a. Recognize Boss
  const bossRecognition = await physicalVisionService.analyzeCameraFrame(undefined, 'boss_simulation');
  assert(bossRecognition.personIdentified === true, 'Person detected in camera frame');
  assert(bossRecognition.identity === 'BOSS', 'Founder / Boss recognized with high accuracy');
  assert(bossRecognition.confidence >= 0.95, 'Recognition confidence is >= 95% (Actual: ' + bossRecognition.confidence + ')');
  assert(bossRecognition.servoTrackingTarget.panAngle === 15, 'Servo Pan tracking calculated');
  assert(bossRecognition.servoTrackingTarget.tiltAngle === 10, 'Servo Tilt tracking calculated');
  assert(bossRecognition.emotionTrigger === 'happy', 'OLED emotion set to happy on recognizing Boss');
  assert(bossRecognition.greetingMessage?.includes('Sếp') === true, 'Greeting mentions Sếp');

  // 1b. Recognize Guest
  const guestRecognition = await physicalVisionService.analyzeCameraFrame(undefined, 'guest_simulation');
  assert(guestRecognition.identity === 'GUEST', 'Guest classified correctly');
  assert(guestRecognition.emotionTrigger === 'curious', 'OLED emotion set to curious for guests');

  // --------------------------------------------------------------------------
  // SECTION 2: SMART HOME & IOT AUTOMATION HUB
  // --------------------------------------------------------------------------
  console.log('\n🏠 SECTION 2: Smart Home & IoT Automation Hub');

  const devices = smartHomeService.getAllDevices();
  assert(devices.length >= 4, 'Discovered at least 4 smart home devices');

  // 2a. Turn on Desk Light
  const lightRes = await smartHomeService.executeCommand({ device: 'desk_light', action: 'turn_on' });
  assert(lightRes.success === true, 'Executed turn_on command for desk_light');
  assert(lightRes.state.power === 'ON', 'Desk light power state is ON');
  assert(lightRes.message.includes('bật Đèn bàn làm việc'), 'Response message confirms desk light is ON');

  // 2b. Set Air Conditioner Temperature
  const acRes = await smartHomeService.executeCommand({
    device: 'air_conditioner',
    action: 'set_temperature',
    value: 24,
  });
  assert(acRes.success === true, 'Executed set_temperature for air conditioner');
  assert(acRes.state.temperature === 24, 'Air conditioner temperature set to 24°C');
  assert(acRes.message.includes('24 độ C'), 'Response message confirms 24°C');

  // 2c. Set Brightness
  const brightRes = await smartHomeService.executeCommand({
    device: 'main_light',
    action: 'set_brightness',
    value: 75,
  });
  assert(brightRes.success === true, 'Executed set_brightness for main_light');
  assert(brightRes.state.brightness === 75, 'Brightness set to 75%');

  // --------------------------------------------------------------------------
  // SECTION 3: TOOL REGISTRY & RBAC FOR SMART HOME CONTROL
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 3: RBAC Security Guard for Smart Home Control');

  const smartTool = toolRegistry.getTool('desktop_smarthome_control');
  assert(Boolean(smartTool), 'desktop_smarthome_control is registered in toolRegistry');

  // 3a. Reject customer
  const unauthRes = await smartTool!.execute({ device: 'air_conditioner', action: 'turn_off' }, {
    role: 'customer',
    channel: 'WEB',
    isAuthenticated: true,
  });
  assert(unauthRes.success === false, 'Customer cannot control smart home devices');
  assert(unauthRes.error?.includes('FORBIDDEN_ACCESS') === true, 'Returns FORBIDDEN_ACCESS to customer');

  // 3b. Authorize Owner
  const authRes = await smartTool!.execute({ device: 'smart_plug', action: 'turn_on' }, {
    role: 'owner',
    channel: 'ROBOT',
    isAuthenticated: true,
  });
  assert(authRes.success === true, 'Owner executes desktop_smarthome_control successfully');
  assert(authRes.action === 'desktop_smarthome_control', 'Action name is preserved');

  // --------------------------------------------------------------------------
  // SECTION 4: GEMINI TOOL BRIDGE & EXECUTIVE DIRECTIVES
  // --------------------------------------------------------------------------
  console.log('\n🧠 SECTION 4: Gemini Tool Bridge & Executive Directives');

  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('desktop_smarthome_control'), 'Executive prompt instructs calling desktop_smarthome_control');
  assert(BOW_JARVIS_EXECUTIVE_SYSTEM_PROMPT.includes('SMART HOME & IOT'), 'Executive prompt defines Smart Home control role');

  const bridgeRes = await executeGeminiTool(
    'desktop_smarthome_control',
    { device: 'desk_light', action: 'turn_on' },
    { role: 'owner', channel: 'ROBOT', isAuthenticated: true }
  );
  assert(bridgeRes.success === true, 'Gemini bridge executes desktop_smarthome_control for Boss');
  assert(bridgeRes.toolName === 'desktop_smarthome_control', 'Tool name matched');

  // --------------------------------------------------------------------------
  // SECTION 5: 24/7 AUTONOMOUS WATCHDOG DAEMON
  // --------------------------------------------------------------------------
  console.log('\n🛡️ SECTION 5: 24/7 Autonomous Watchdog Daemon');

  const healthReport = watchdogDaemon.runHealthCheck();
  assert(healthReport.status === 'HEALTHY', 'Watchdog health check status is HEALTHY');
  assert(healthReport.metrics.memoryUsageMb > 0, 'Monitors memory usage (MB)');
  assert(healthReport.metrics.activeChannels.includes('ROBOT'), 'Watches active ROBOT channel');

  const emergencyReport = watchdogDaemon.triggerEmergencyAlert('Cổng thanh toán ngân hàng ngừng phản hồi');
  assert(emergencyReport.status === 'CRITICAL', 'Emergency trigger escalates status to CRITICAL');
  assert(emergencyReport.alarmTriggered === true, 'Emergency trigger activates alarm');
  assert(emergencyReport.alertMessage?.includes('BÁO ĐỘNG KHẨN CẤP') === true, 'Alert message format is urgent');

  // --------------------------------------------------------------------------
  // SECTION 6: SERVER HEALTH CHECK WITH V4.0.0 & EMBODIED STATUS
  // --------------------------------------------------------------------------
  console.log('\n🌐 SECTION 6: Server Health Check Integration (V4.0.0)');

  const testPort = 4078;
  const server = new BowCentralAgentServer({ port: testPort });
  await server.start();

  try {
    const healthData: any = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/health`, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    assert(healthData.status === 'ok', 'Server /health endpoint returned status ok');
    assert(healthData.version === '4.0.0', 'Server version is officially 4.0.0');
    assert(Boolean(healthData.embodiedWatchdog), 'Server includes embodiedWatchdog metrics');
    assert(healthData.embodiedWatchdog.status === 'HEALTHY', 'Watchdog daemon status is HEALTHY');
  } finally {
    await server.stop();
  }

  // --------------------------------------------------------------------------
  // TEST REPORT SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 V4.0 MILESTONE 3 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🌟 ALL SECTIONS (1-6) PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runEmbodiedSuite().catch((err) => {
  console.error('Fatal error running embodied suite:', err);
  process.exit(1);
});
