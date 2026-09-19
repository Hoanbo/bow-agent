// tests/profile_hardening.ts
// BOWCON V4.0 — VOICE BODY HARDENING & LATENCY PROFILER
// Scientific measurement of real STT, real Piper TTS, BodyProtocol, and VoicePipeline

import fs from 'node:fs';
import path from 'node:path';
import { sttEngine } from '../src/speech/sttEngine.js';
import { globalPiperTtsEngine } from '../src/speech/piperTtsEngine.js';
import { BowCentralAgentServer } from '../src/server.js';
import { DesktopBodyRunner } from '../bodies/desktop/index.js';
import { globalBodyRegistry, getBodyPsk } from '../src/core/bodyProtocol/index.js';
import { globalVoicePipeline } from '../src/speech/voicePipeline.js';

interface ProfilerResults {
  sttRuns: number[];
  ttsRuns: number[];
  bodyProtocolRuns: number[];
  pipelineRuns: {
    capture: number;
    stt: number;
    brain: number;
    tts: number;
    playback: number;
    total: number;
    timeToFirstAudio: number;
  }[];
}

async function runProfiler(): Promise<void> {
  console.log('========================================================================');
  console.log('🔬 BOWCON VOICE BODY — SCIENTIFIC HARDENING & LATENCY PROFILER');
  console.log('========================================================================\n');

  const fixturePath = path.resolve('.tmp/benchmark-audio/sentence_1.wav');
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture audio not found at: ${fixturePath}`);
  }
  const fixtureBuffer = fs.readFileSync(fixturePath);
  console.log(`[FIXTURE] Loaded fixed audio fixture: ${fixturePath} (${fixtureBuffer.byteLength} bytes)`);

  // -------------------------------------------------------------------------
  // 1. STT PROFILING (3 RUNS)
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 4: REAL STT PROFILING (WHISPER.CPP CPU AVX2) ---');
  const sttRuns: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now();
    const res = await sttEngine.transcribe(fixtureBuffer, { language: 'vi' });
    const elapsed = Date.now() - t0;
    sttRuns.push(elapsed);
    console.log(`  STT Run ${i}: ${elapsed}ms | Success: ${res.success} | Text: "${res.text}"`);
  }
  const sttMin = Math.min(...sttRuns);
  const sttMax = Math.max(...sttRuns);
  const sttAvg = Math.round(sttRuns.reduce((a, b) => a + b, 0) / sttRuns.length);
  console.log(`  -> STT Stats: Min=${sttMin}ms, Max=${sttMax}ms, Avg=${sttAvg}ms`);

  // -------------------------------------------------------------------------
  // 2. PIPER TTS PROFILING (3 RUNS)
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 5: REAL PIPER TTS PROFILING (DUY ORYX MODEL) ---');
  const testPhrase = 'Xin chào Sếp. Tôi là BOWCON. Tôi đã sẵn sàng phục vụ Sếp.';
  const ttsRuns: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now();
    const res = await globalPiperTtsEngine.synthesize(testPhrase, { returnBase64: false });
    const elapsed = Date.now() - t0;
    ttsRuns.push(elapsed);
    console.log(`  Piper Run ${i}: ${elapsed}ms | Success: ${res.success} | Bytes: ${res.byteLength}`);
  }
  const ttsMin = Math.min(...ttsRuns);
  const ttsMax = Math.max(...ttsRuns);
  const ttsAvg = Math.round(ttsRuns.reduce((a, b) => a + b, 0) / ttsRuns.length);
  console.log(`  -> Piper Stats: Min=${ttsMin}ms, Max=${ttsMax}ms, Avg=${ttsAvg}ms`);

  // -------------------------------------------------------------------------
  // 3. BODYPROTOCOL OVERHEAD PROFILING (3 RUNS)
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 6: BODYPROTOCOL OVERHEAD PROFILING ---');
  const TEST_PORT = 4105;
  const server = new BowCentralAgentServer({ port: TEST_PORT, host: '127.0.0.1' });
  await server.start();
  const validPsk = getBodyPsk();
  const bodyRunner = new DesktopBodyRunner(`ws://127.0.0.1:${TEST_PORT}/ws/body`, 'profiler_body_node', validPsk);
  await bodyRunner.start();
  await new Promise((r) => setTimeout(r, 600));

  const bpRuns: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now();
    const cmdRes = await globalBodyRegistry.executeBodyCommand({
      commandId: `cmd_bp_${Date.now()}`,
      bodyId: 'profiler_body_node',
      capability: 'audio.status',
      params: {},
    });
    const elapsed = Date.now() - t0;
    bpRuns.push(elapsed);
    console.log(`  BodyProtocol Dispatch Run ${i}: ${elapsed}ms (Handler Exec: ${cmdRes.executionTimeMs}ms)`);
  }
  const bpMin = Math.min(...bpRuns);
  const bpMax = Math.max(...bpRuns);
  const bpAvg = Math.round(bpRuns.reduce((a, b) => a + b, 0) / bpRuns.length);
  console.log(`  -> BodyProtocol Stats: Min=${bpMin}ms, Max=${bpMax}ms, Avg=${bpAvg}ms`);

  // -------------------------------------------------------------------------
  // 4. FULL VOICE PIPELINE ROUNDTRIP PROFILING (3 RUNS)
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 3: END-TO-END PIPELINE & USER-PERCEIVED LATENCY (3 RUNS) ---');
  const pipelineResults = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\n  [Roundtrip Run ${i}/3] Executing...`);
    const res = await globalVoicePipeline.executeVoiceRoundtrip({
      bodyId: 'profiler_body_node',
      captureDurationMs: 1000,
      userId: 'boss_user',
      role: 'owner',
      isOwner: true,
    });

    const timeToFirstAudio = res.captureDurationMs + res.sttDurationMs + res.brainDurationMs + res.ttsDurationMs;
    const item = {
      capture: res.captureDurationMs,
      stt: res.sttDurationMs,
      brain: res.brainDurationMs,
      tts: res.ttsDurationMs,
      playback: res.playbackDurationMs,
      total: res.totalDurationMs,
      timeToFirstAudio,
    };
    pipelineResults.push(item);
    console.log(`    Capture       : ${item.capture} ms`);
    console.log(`    STT           : ${item.stt} ms`);
    console.log(`    Brain         : ${item.brain} ms`);
    console.log(`    Piper TTS     : ${item.tts} ms`);
    console.log(`    Audio Playback: ${item.playback} ms`);
    console.log(`    TOTAL DURATION: ${item.total} ms`);
    console.log(`    >>> TIME TO FIRST AUDIO (User hears speech): ${item.timeToFirstAudio} ms <<<`);
  }

  // Teardown
  await bodyRunner.stop();
  await server.stop();

  // Print Summary Table
  console.log('\n========================================================================');
  console.log('                      FINAL LATENCY PROFILE TABLE                       ');
  console.log('========================================================================');
  console.log('| Stage                  | Run 1  | Run 2  | Run 3  | Min    | Max    | Avg    |');
  console.log('|------------------------|-------:|-------:|-------:|-------:|-------:|-------:|');

  function row(name: string, arr: number[]) {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const pad = (v: number) => String(v).padStart(6, ' ');
    console.log(`| ${name.padEnd(22)} | ${pad(arr[0])} | ${pad(arr[1])} | ${pad(arr[2])} | ${pad(min)} | ${pad(max)} | ${pad(avg)} |`);
  }

  row('capture', pipelineResults.map(p => p.capture));
  row('STT (whisper.cpp)', pipelineResults.map(p => p.stt));
  row('Brain (AgentLoop)', pipelineResults.map(p => p.brain));
  row('Piper (Duy Oryx)', pipelineResults.map(p => p.tts));
  row('BodyProtocol overhead', bpRuns);
  row('playback (audio len)', pipelineResults.map(p => p.playback));
  row('TIME TO FIRST AUDIO', pipelineResults.map(p => p.timeToFirstAudio));
  row('TOTAL ROUNDTRIP', pipelineResults.map(p => p.total));
  console.log('========================================================================\n');
}

runProfiler().catch((err) => {
  console.error('\n❌ PROFILER FAILED:', err);
  process.exit(1);
});
