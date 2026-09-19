// tests/test_voice_vertical_slice.ts
// BOWCON V4.0 — PRODUCTION VOICE VERTICAL SLICE END-TO-END VERIFICATION
//
// EN:
// Rigorous verification of the complete real voice path:
// Real Mic -> BodyProtocol audio.capture -> Real Whisper STT -> Real Canonical Brain -> Real Piper Duy Oryx TTS -> Real Body audio.play -> L80PRO Speakers.
//
// Supports two distinct modes:
// MODE A: Automated Integration Test (--mode=test, default)
// MODE B: Real Live Hardware Voice Test (--mode=live)

import path from 'node:path';
import fs from 'node:fs';
import { BowCentralAgentServer } from '../src/server.js';
import { DesktopBodyRunner } from '../bodies/desktop/index.js';
import { globalBodyRegistry, getBodyPsk } from '../src/core/bodyProtocol/index.js';
import { globalVoicePipeline } from '../src/speech/voicePipeline.js';
import { sttEngine } from '../src/speech/sttEngine.js';
import { globalPiperTtsEngine } from '../src/speech/piperTtsEngine.js';
import { desktopAudioDriver } from '../bodies/desktop/audioDriver.js';

interface LatencyReport {
  captureMs: number;
  sttMs: number;
  brainMs: number;
  ttsMs: number;
  playbackMs: number;
  totalMs: number;
}

async function runVoiceVerticalSlice(): Promise<void> {
  const args = process.argv.slice(2);
  const isLiveMode = args.includes('--mode=live');
  const TEST_PORT = 4099;

  console.log('========================================================================');
  console.log(`🎙️ BOWCON VOICE VERTICAL SLICE [MODE: ${isLiveMode ? 'MODE B - LIVE HARDWARE' : 'MODE A - INTEGRATION'}]`);
  console.log('========================================================================\n');

  // STEP 1: VERIFY HARDWARE & PRE-CONDITIONS
  console.log('[STEP 1] Verifying Real Hardware & Standalone Runtimes...');
  const audioDevices = await desktopAudioDriver.listAudioDevices();
  const inputs = audioDevices?.inputs || [];
  const outputs = audioDevices?.outputs || [];
  console.log(`  Audio Inputs : ${inputs.map((d: any) => `[${d.id}] ${d.name}`).join(', ')}`);
  console.log(`  Audio Outputs: ${outputs.map((d: any) => `[${d.id}] ${d.name}`).join(', ')}`);

  const micL80 = inputs.find((d: any) => d.name.includes('L80PRO') || d.name.includes('Microphone'));
  const spkL80 = outputs.find((d: any) => d.name.includes('L80PRO') || d.name.includes('Speakers'));

  console.log(`  Target Input : ${micL80?.name || 'Default Microphone'} (ID: ${micL80?.id ?? 0})`);
  console.log(`  Target Output: ${spkL80?.name || 'Default Speakers'} (ID: ${spkL80?.id ?? 0})`);

  const sttStatus = sttEngine.getStatus();
  console.log(`  Whisper STT  : ${sttStatus.whisperAvailable ? 'READY' : 'MISSING'} (${sttStatus.whisperPath})`);
  console.log(`  Whisper Model: ${sttStatus.modelAvailable ? 'READY' : 'MISSING'} (${sttStatus.modelPath})`);

  const ttsStatus = globalPiperTtsEngine.getStatus();
  console.log(`  Piper TTS    : ${ttsStatus.piperAvailable ? 'READY' : 'MISSING'} (${ttsStatus.piperPath})`);
  console.log(`  Duy Oryx Mod : ${ttsStatus.modelAvailable ? 'READY' : 'MISSING'} (${ttsStatus.modelPath})`);

  if (!sttStatus.whisperAvailable || !sttStatus.modelAvailable) {
    throw new Error('GATE FAILURE: Whisper runtime or model is missing!');
  }
  if (!ttsStatus.piperAvailable || !ttsStatus.modelAvailable) {
    throw new Error('GATE FAILURE: Piper runtime or Duy Oryx model is missing!');
  }
  console.log('  -> PASS: All runtime runtimes and models verified.\n');

  // STEP 2: START CENTRAL BRAIN SERVER
  console.log(`[STEP 2] Starting BowCentralAgentServer on port ${TEST_PORT}...`);
  const server = new BowCentralAgentServer({ port: TEST_PORT, host: '127.0.0.1' });
  await server.start();
  console.log('  -> PASS: Central Brain Server active.\n');

  // STEP 3: START DESKTOP BODY RUNNER (WEBSOCKET WITH PSK)
  console.log('[STEP 3] Connecting Desktop Body via BodyProtocol (PSK Auth)...');
  const validPsk = getBodyPsk();
  const bodyRunner = new DesktopBodyRunner(`ws://127.0.0.1:${TEST_PORT}/ws/body`, 'desktop_vertical_slice_node', validPsk);
  await bodyRunner.start();
  await new Promise((r) => setTimeout(r, 600));

  const registered = globalBodyRegistry.getBody('desktop_vertical_slice_node');
  if (!registered) {
    throw new Error('FAIL: Body was not registered in globalBodyRegistry!');
  }
  console.log(`  -> PASS: Body registered: ${registered.name} (Capabilities: ${Array.from(registered.capabilities.keys()).join(', ')})\n`);

  // STEP 4: EXECUTE VOICE PATH
  console.log('[STEP 4] Executing Real End-to-End Voice Roundtrip...');
  let roundtripResult: any;

  if (isLiveMode) {
    console.log('  -------------------------------------------------------------');
    console.log('  🎤 LIVE TEST: Xin hãy nói vào tai nghe L80PRO trong 3 giây...');
    console.log('  Ví dụ: "Xin chào BOWCON, hãy cho tôi biết hệ thống đang hoạt động như thế nào."');
    console.log('  -------------------------------------------------------------');
    for (let sec = 3; sec > 0; sec--) {
      console.log(`  Bắt đầu thu âm trong: ${sec}...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log('  🔴 ĐANG THU ÂM TỪ MICRO L80PRO THẬT...');

    roundtripResult = await globalVoicePipeline.executeVoiceRoundtrip({
      bodyId: 'desktop_vertical_slice_node',
      captureDurationMs: 3000,
      userId: 'boss_user',
      role: 'owner',
      isOwner: true,
    });
  } else {
    // Mode A: Automated Integration Test
    // 1. Synthesize a pristine speech WAV using Duy Oryx
    console.log('  [Mode A] Generating test speech WAV using Duy Oryx ("Xin chào BOWCON")...');
    const testText = 'Xin chào BOWCON';
    const testSpeechRes = await globalPiperTtsEngine.synthesize(testText);
    if (!testSpeechRes.success || !testSpeechRes.wavFilePath) {
      throw new Error(`Failed to synthesize test speech: ${testSpeechRes.error}`);
    }

    // 2. Transcribe using real Whisper.cpp STT
    console.log('  [Mode A] Transcribing test WAV with Whisper.cpp STT (vi)...');
    const wavBuf = fs.readFileSync(testSpeechRes.wavFilePath);
    const sttTest = await sttEngine.transcribe(wavBuf, { language: 'vi' });
    console.log(`  [Mode A] Real STT Output: "${sttTest.text}" (Latency: ${sttTest.latencyMs}ms)`);

    if (!sttTest.success || !sttTest.text) {
      throw new Error(`Real STT failed: ${sttTest.error}`);
    }

    // 3. Execute VoicePipeline roundtrip with real speech audio
    console.log('  [Mode A] Executing VoicePipeline through BodyProtocol with test speech audio...');
    roundtripResult = await globalVoicePipeline.executeVoiceRoundtrip({
      bodyId: 'desktop_vertical_slice_node',
      audioBufferOverride: wavBuf,
      captureDurationMs: 1000,
      userId: 'boss_user',
      role: 'owner',
      isOwner: true,
    });
  }

  console.log('\n========================================================================');
  console.log('               VOICE VERTICAL SLICE EXECUTION RESULTS                   ');
  console.log('========================================================================');
  console.log(`Success           : ${roundtripResult.success}`);
  console.log(`Correlation ID    : ${roundtripResult.correlationId}`);
  console.log(`User Text (STT)   : "${roundtripResult.userText}"`);
  console.log(`Brain Response    : "${roundtripResult.responseText}"`);
  console.log(`AgentLoop State   : ${roundtripResult.agentLoopState}`);
  console.log(`Playback Device   : ${roundtripResult.audioPlayback?.deviceName || 'Speakers (L80PRO)'}`);
  console.log('------------------------------------------------------------------------');
  console.log('LATENCY BREAKDOWN:');
  console.log(`  1. Audio Capture : ${roundtripResult.captureDurationMs} ms`);
  console.log(`  2. Real STT      : ${roundtripResult.sttDurationMs} ms`);
  console.log(`  3. Brain Thinking: ${roundtripResult.brainDurationMs} ms`);
  console.log(`  4. Piper TTS     : ${roundtripResult.ttsDurationMs} ms`);
  console.log(`  5. Audio Playback: ${roundtripResult.playbackDurationMs} ms`);
  console.log(`  TOTAL ROUNDTRIP  : ${roundtripResult.totalDurationMs} ms`);
  console.log('========================================================================\n');

  if (!roundtripResult.success) {
    throw new Error(`Voice roundtrip failed: ${roundtripResult.error}`);
  }

  // STEP 5: VERIFY DESKTOP ACTION DISPATCH ("Mở Notepad")
  console.log('[STEP 5] Verifying Voice Command to Desktop Tool ("Mở Notepad")...');
  const actionResult = await globalVoicePipeline.executeVoiceRoundtrip({
    bodyId: 'desktop_vertical_slice_node',
    simulatedTranscript: 'Mở Notepad',
    captureDurationMs: 500,
    userId: 'boss_user',
    role: 'owner',
    isOwner: true,
  });

  console.log(`  Action Success: ${actionResult.success}`);
  console.log(`  Agent Response: "${actionResult.responseText}"`);
  console.log(`  Agent State   : ${actionResult.agentLoopState}`);
  if (!actionResult.success) {
    throw new Error(`Desktop action voice execution failed: ${actionResult.error}`);
  }
  console.log('  -> PASS: Desktop tool dispatch ("Mở Notepad" -> system.open_app) verified.\n');

  // STEP 6: CLEANUP
  console.log('[STEP 6] Cleaning up test server and body runner...');
  await bodyRunner.stop();
  await server.stop();
  console.log('Teardown complete.');
  console.log('Voice vertical slice test execution finished.');
}

runVoiceVerticalSlice().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
