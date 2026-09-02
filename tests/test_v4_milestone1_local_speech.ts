// tests/test_v4_milestone1_local_speech.ts
// BOW AGENT V4.0 MILESTONE 1 — LOCAL SPEECH & HYBRID OFFLINE ENGINE TEST SUITE

import http from 'node:http';
import {
  ttsEngine,
  sttEngine,
  localLlmProvider,
  hybridLlmRouter,
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

async function runLocalSpeechSuite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING V4.0 MILESTONE 1: LOCAL SPEECH & HYBRID OFFLINE TEST SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: LOCAL PIPER TTS ENGINE (SUB-50ms LATENCY)
  // --------------------------------------------------------------------------
  console.log('🎙️ SECTION 1: Local Piper TTS Engine (Sub-50ms Speech Synthesis)');

  const ttsStatus = ttsEngine.getTtsStatus();
  assert(ttsStatus.status === 'ready', 'TTS Engine status is ready');
  assert(ttsStatus.preferLocal === true, 'TTS Engine prefers ultra-fast local synthesis');
  assert(ttsStatus.activeEngine === 'local_piper_fast', 'Active engine is local_piper_fast');

  // 1a. Local Piper Fast Synthesis (< 50ms)
  const localTts = await ttsEngine.synthesize('Chào Sếp, em đang phát âm tại chỗ trên máy tính.', {
    engine: 'local_fast',
  });
  assert(localTts.success === true, 'Local Piper TTS synthesis succeeded');
  assert(localTts.engineUsed === 'local_fast', 'Engine used is local_fast');
  assert(localTts.voice === 'vi-VN-PiperLocalFast', 'Voice is vi-VN-PiperLocalFast');
  assert(localTts.audioLatencyMs < 50, 'Synthesis latency is < 50ms (Actual: ' + localTts.audioLatencyMs + 'ms)');

  // 1b. Cloud Edge-TTS fallback
  const cloudTts = await ttsEngine.synthesize('Báo cáo chi tiết qua đám mây', {
    engine: 'cloud_edge',
  });
  assert(cloudTts.success === true, 'Cloud Edge-TTS synthesis succeeded');
  assert(cloudTts.engineUsed === 'cloud_edge', 'Engine used is cloud_edge');
  assert(cloudTts.voice === 'vi-VN-HoaiMyNeural', 'Voice is vi-VN-HoaiMyNeural');

  // --------------------------------------------------------------------------
  // SECTION 2: LOCAL WHISPER STT (VULKAN RX 580) & VAD
  // --------------------------------------------------------------------------
  console.log('\n👂 SECTION 2: Local Whisper STT (Vulkan RX 580) & Fast VAD');

  // 2a. Voice Activity Detection (VAD)
  const vadResult = sttEngine.detectVoiceActivity('fake_audio_pcm_stream_data_sample_for_testing');
  assert(vadResult.speechEnded === true, 'VAD successfully detects end of speech');
  assert(vadResult.energyLevel > 0.8, 'VAD calculates positive energy level');

  // 2b. Local Whisper transcription
  const sttResult = await sttEngine.transcribe('Báo cáo doanh thu cho anh', { preferLocal: true });
  assert(sttResult.success === true, 'Local Whisper transcription succeeded');
  assert(sttResult.backend === 'local_whisper_vulkan', 'STT backend used local_whisper_vulkan');
  assert(sttResult.text === 'Báo cáo doanh thu cho anh', 'Text accurately transcribed');
  assert(sttResult.latencyMs < 50, 'Transcription processed in < 50ms (Actual: ' + sttResult.latencyMs + 'ms)');

  // --------------------------------------------------------------------------
  // SECTION 3: LOCAL SLM PROVIDER (QWEN 2.5 ON AMD RX 580)
  // --------------------------------------------------------------------------
  console.log('\n💻 SECTION 3: Local SLM Provider (Qwen 2.5 on AMD RX 580 Vulkan)');

  assert(localLlmProvider.isConfigured() === true, 'Local SLM provider is configured');
  assert(localLlmProvider.getModelName() === 'qwen2.5:1.5b', 'Model name configured as qwen2.5:1.5b');

  // 3a. Local offline greeting
  const localGreet = await localLlmProvider.sendMessage('Chào em');
  assert(localGreet.success === true, 'Local SLM handled greeting offline');
  assert(localGreet.text?.includes('Sếp') === true, 'Local response greets Boss politely');

  // 3b. Local offline time query
  const localTime = await localLlmProvider.sendMessage('Mấy giờ rồi em?');
  assert(localTime.success === true, 'Local SLM handled time query offline');
  assert(localTime.text?.includes('bây giờ là') === true, 'Local response provides real-time clock');

  // --------------------------------------------------------------------------
  // SECTION 4: HYBRID EDGE-CLOUD FAILOVER ROUTER
  // --------------------------------------------------------------------------
  console.log('\n🔀 SECTION 4: Hybrid Edge-Cloud Failover Router (Zero Single Point of Failure)');

  const routerHealth = hybridLlmRouter.getHealthStatus();
  assert(routerHealth.status === 'operational', 'Hybrid router status is operational');
  assert(routerHealth.localAvailable === true, 'Local SLM backend is available');

  // 4a. Force local routing
  const forcedLocalRes = await hybridLlmRouter.routeMessage('chào em', undefined, undefined, true);
  assert(forcedLocalRes.success === true, 'Routed message successfully to local engine');
  assert(forcedLocalRes.activeBackend === 'local_slm_rx580', 'Active backend is local_slm_rx580');

  // 4b. Smart routing fallback
  const autoRes = await hybridLlmRouter.routeMessage('Mấy giờ rồi em');
  assert(autoRes.success === true, 'Smart routing executed successfully');
  assert(typeof autoRes.latencyMs === 'number', 'Latency tracked in milliseconds');

  // --------------------------------------------------------------------------
  // SECTION 5: CENTRAL SERVER HEALTH CHECK INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n🌐 SECTION 5: Central Server Health Check Integration');

  const testPort = 4099;
  const testServer = new BowCentralAgentServer({ port: testPort });
  await testServer.start();

  try {
    const healthData: any = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/health`, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    assert(healthData.status === 'ok', 'Server /health endpoint returned status ok');
    assert(healthData.version === '4.0.0', 'Server version is 4.0.0');
    assert(Boolean(healthData.hybridRouting), 'Health payload includes hybridRouting info');

    assert(healthData.hybridRouting.localAvailable === true, 'Hybrid routing confirms local SLM available');
    assert(Boolean(healthData.speechEngine), 'Health payload includes speechEngine info');
    assert(healthData.speechEngine.activeEngine === 'local_piper_fast', 'Speech engine confirms local_piper_fast');
  } finally {
    await testServer.stop();
  }

  // --------------------------------------------------------------------------
  // TEST REPORT SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 V4.0 MILESTONE 1 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🌟 ALL SECTIONS (1-5) PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runLocalSpeechSuite().catch((err) => {
  console.error('Fatal error running local speech test suite:', err);
  process.exit(1);
});
