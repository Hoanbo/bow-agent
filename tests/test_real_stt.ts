// tests/test_real_stt.ts
import { sttEngine } from '../src/speech/sttEngine.js';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('Testing Real Vietnamese STT Engine (Whisper.cpp)...');
  const wavPath = path.resolve('.tmp/benchmark-audio/sentence_1.wav');
  if (!fs.existsSync(wavPath)) {
    throw new Error(`Test WAV not found at: ${wavPath}`);
  }

  const audioBuffer = fs.readFileSync(wavPath);
  console.log(`Audio buffer loaded: ${audioBuffer.byteLength} bytes.`);

  const res = await sttEngine.transcribe(audioBuffer, { language: 'vi' });
  console.log('STT Result:');
  console.log(JSON.stringify(res, null, 2));

  if (!res.success) {
    throw new Error(`STT failed: ${res.error}`);
  }

  console.log(`\nTranscribed text: "${res.text}"`);
  console.log(`Backend: ${res.backend}`);
  console.log(`Latency: ${res.latencyMs}ms`);
}

main().catch(console.error);
