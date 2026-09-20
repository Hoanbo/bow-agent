// tests/repeatability_tts.ts
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalPiperTtsEngine } from '../src/speech/piperTtsEngine.js';

const SENTENCE_A = "Tôi đã hoàn thành yêu cầu của Sếp. Đây là kết quả mà tôi thu được.";
const SENTENCE_B = "Tôi không thể thực hiện hành động này vì quyền hạn hiện tại không cho phép.";

function getSha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function getWavDuration(filePath: string): number {
  const buf = fs.readFileSync(filePath);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  const channels = buf.readUInt16LE(22);
  let offset = 36;
  let dataSize = 0;
  while (offset < buf.length - 8) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }
  return Number((dataSize / (bitsPerSample / 8) / channels / sampleRate).toFixed(3));
}

async function run() {
  const outDir = path.resolve('.tmp/repeatability');
  fs.mkdirSync(outDir, { recursive: true });

  const runs = [
    { run: 1, sentence: 'A', text: SENTENCE_A },
    { run: 2, sentence: 'A', text: SENTENCE_A },
    { run: 3, sentence: 'A', text: SENTENCE_A },
    { run: 1, sentence: 'B', text: SENTENCE_B },
    { run: 2, sentence: 'B', text: SENTENCE_B },
    { run: 3, sentence: 'B', text: SENTENCE_B },
  ];

  console.log('| Run | Sentence | TTS Success | Duration (s) | Byte Length | SHA-256 | Target bodyId | audio.play Status | Playback Result |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const r of runs) {
    const wavPath = path.join(outDir, `rep_${r.sentence}_${r.run}.wav`);
    const res = await globalPiperTtsEngine.synthesize(r.text, { outputWavPath: wavPath });
    const duration = getWavDuration(wavPath);
    const sha = getSha256(wavPath);

    // Attempt dispatch to Machine B bodyId
    const dispatchRes = await fetch('http://127.0.0.1:4000/api/body/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bodyId: 'desktop_xeon_desktopedffnvt',
        capability: 'audio.play',
        params: { wavFilePath: wavPath },
      }),
    }).then(res => res.json()).catch(err => ({ success: false, error: err.message }));

    console.log(`| ${r.run} | Sentence ${r.sentence} | ${res.success} | ${duration} | ${res.byteLength} | \`${sha.substring(0, 16)}...\` | \`desktop_xeon_desktopedffnvt\` | ${dispatchRes.success} | ${dispatchRes.error || 'BLOCKED'} |`);
  }
}

run().catch(console.error);
