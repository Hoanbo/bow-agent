// scripts/audition_voice.mjs
import path from 'node:path';
import fs from 'node:fs';
import { PiperTtsEngine } from '../src/speech/piperTtsEngine.ts';

const VOICE_CATALOG = {
  'deepman3909': {
    name: 'Deepman 3909',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-03-deepman-3909/deepman3909.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-03-deepman-3909/deepman3909.onnx.json'),
  },
  'quanghuy': {
    name: 'Quang Huy',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-01-quang-huy/vi_VN-csa-voice-piper-v3-medium.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-01-quang-huy/vi_VN-csa-voice-piper-v3-medium.onnx.json'),
    speakerId: 2,
  },
  'manhdung': {
    name: 'Mạnh Dũng',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-04-manh-dung/manhdung.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-04-manh-dung/manhdung.onnx.json'),
  },
  'minhquang': {
    name: 'Minh Quang',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-05-minh-quang/minhquang.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-05-minh-quang/minhquang.onnx.json'),
  },
  'lacphi': {
    name: 'Lạc Phi',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-06-lac-phi/lacphi.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-06-lac-phi/lacphi.onnx.json'),
  },
  'duyoryx': {
    name: 'Duy Oryx',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-07-duy-oryx/duyoryx3175.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-07-duy-oryx/duyoryx3175.onnx.json'),
  },
  'minhkhang': {
    name: 'Minh Khang',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-08-minh-khang/minhkhang.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-08-minh-khang/minhkhang.onnx.json'),
  },
  'thanhnien-tu-tin': {
    name: 'Thanh Niên Tự Tin',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-02-thanh-nien-tu-tin/vi_VN-thanh_nien_tu_tin-medium.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-02-thanh-nien-tu-tin/vi_VN-thanh_nien_tu_tin-medium.onnx.json'),
  },
};

const voiceKey = process.argv[2] || 'deepman3909';
const voiceInfo = VOICE_CATALOG[voiceKey];
if (!voiceInfo) {
  console.error(`UNKNOWN_VOICE: Voice "${voiceKey}" not found. Available: ${Object.keys(VOICE_CATALOG).join(', ')}`);
  process.exit(1);
}

const text = "Xin chào, tôi là BOW Con, trợ lý của Ngài";
console.log(`[AUDITION] Voice: ${voiceInfo.name} (${voiceKey})`);
console.log(`[AUDITION] Model ONNX: ${voiceInfo.modelPath}`);
console.log(`[AUDITION] Text: "${text}"`);

const engine = new PiperTtsEngine({
  modelPath: voiceInfo.modelPath,
  configPath: voiceInfo.configPath,
});

console.log('[AUDITION] Synthesizing speech with Piper...');
const ttsResult = await engine.synthesize(text, { returnBase64: true, speakerId: voiceInfo.speakerId });
console.log('--- TTS SYNTHESIS RESULT ---');
console.log(JSON.stringify({
  success: ttsResult.success,
  errorCode: ttsResult.errorCode,
  sampleRate: ttsResult.sampleRate,
  durationMs: ttsResult.durationMs,
  byteLength: ttsResult.byteLength,
  wavFilePath: ttsResult.wavFilePath,
}, null, 2));

if (!ttsResult.success || !ttsResult.audioBase64) {
  console.error('[AUDITION] Synthesis failed:', ttsResult.error);
  process.exit(1);
}

// Dispatch to Body on Xeon 1-chip
const bodyId = 'desktop_xeon_desktopedffnvt';
console.log(`[AUDITION] Dispatching audio.play to Body "${bodyId}"...`);

const playRes = await fetch('http://127.0.0.1:4000/api/body/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bodyId,
    capability: 'audio.play',
    params: {
      audioBase64: ttsResult.audioBase64,
      format: 'wav',
    },
  }),
});

const playData = await playRes.json();
console.log('--- BODY AUDIO.PLAY RESPONSE ---');
console.log(JSON.stringify(playData, null, 2));
