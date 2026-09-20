// tests/forensic_tts_phases.ts
// Forensic TTS execution for Phase 7 & Phase 8 on Machine A

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalPiperTtsEngine } from '../src/speech/piperTtsEngine.js';

const SENTENCE_A = "Tôi đã hoàn thành yêu cầu của Sếp. Đây là kết quả mà tôi thu được.";
const SENTENCE_B = "Tôi không thể thực hiện hành động này vì quyền hạn hiện tại không cho phép.";

function inspectText(label: string, text: string) {
  console.log(`=== TEXT ANALYSIS: ${label} ===`);
  console.log('TEXT_INPUT_START');
  console.log(text);
  console.log('TEXT_INPUT_END');

  const textBeforeTts = text.trim();
  console.log('TEXT_BEFORE_TTS_START');
  console.log(textBeforeTts);
  console.log('TEXT_BEFORE_TTS_END');

  const buf = Buffer.from(textBeforeTts, 'utf8');
  console.log(`UTF-8 byte length : ${buf.length}`);
  console.log(`UTF-8 hex         : ${buf.toString('hex')}`);

  const codePoints = Array.from(textBeforeTts).map((char) => {
    const cp = char.codePointAt(0)!;
    return `${char} (U+${cp.toString(16).toUpperCase().padStart(4, '0')})`;
  });
  console.log(`Code points count : ${codePoints.length}`);

  const targets = ['Đ', 'â', 'y', 'quyền', 'thực', 'hiện', 'Sếp'];
  console.log('Target substring check:');
  for (const t of targets) {
    const found = textBeforeTts.includes(t);
    const hex = Buffer.from(t, 'utf8').toString('hex');
    console.log(`  "${t}": found=${found} (hex: ${hex})`);
  }
  console.log('------------------------------------------------------------\n');
}

function parseWavDetails(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const riff = buf.toString('ascii', 0, 4);
  const wave = buf.toString('ascii', 8, 12);
  const audioFormat = buf.readUInt16LE(20);
  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const byteRate = buf.readUInt32LE(28);
  const blockAlign = buf.readUInt16LE(32);
  const bitsPerSample = buf.readUInt16LE(34);

  let offset = 36;
  let dataOffset = 0;
  let dataSize = 0;
  while (offset < buf.length - 8) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'data') {
      dataSize = chunkSize;
      dataOffset = offset + 8;
      break;
    }
    offset += 8 + chunkSize;
  }

  const sampleCount = Math.floor(dataSize / (bitsPerSample / 8) / channels);
  const durationSec = sampleCount / sampleRate;

  let minSample = 0;
  let maxSample = 0;
  let sumSquares = 0;
  for (let i = 0; i < sampleCount; i++) {
    const s = buf.readInt16LE(dataOffset + i * 2);
    if (s < minSample) minSample = s;
    if (s > maxSample) maxSample = s;
    sumSquares += s * s;
  }
  const rms = Math.sqrt(sumSquares / sampleCount);
  const peak = Math.max(Math.abs(minSample), Math.abs(maxSample));

  return {
    riff,
    wave,
    pcm: audioFormat === 1 ? 'PCM (Format 1)' : `Unknown (${audioFormat})`,
    channels,
    sampleRate,
    bitsPerSample,
    byteRate,
    blockAlign,
    dataSize,
    sampleCount,
    durationSec: Number(durationSec.toFixed(3)),
    fileSizeBytes: buf.length,
    peakSample: peak,
    minSample,
    maxSample,
    rms: Number(rms.toFixed(2)),
    isSilence: rms < 100 || peak < 500,
  };
}

function getSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const outDir = path.resolve('.tmp/forensic-e2e');
  fs.mkdirSync(outDir, { recursive: true });

  const cases = [
    { label: 'SENTENCE A', text: SENTENCE_A, id: 'A' },
    { label: 'SENTENCE B', text: SENTENCE_B, id: 'B' },
  ];

  for (const c of cases) {
    inspectText(c.label, c.text);

    const outWav = path.join(outDir, `prod_sent_${c.id}.wav`);
    console.log(`[SYNTHESIZING ${c.label}]`);
    const t0 = Date.now();
    const res = await globalPiperTtsEngine.synthesize(c.text, {
      outputWavPath: outWav,
      returnBase64: false,
    });
    const elapsed = Date.now() - t0;

    console.log('PiperTtsEngine.synthesize() output:');
    console.log(`  success     : ${res.success}`);
    console.log(`  errorCode   : ${res.errorCode}`);
    console.log(`  error       : ${res.error || 'none'}`);
    console.log(`  durationMs  : ${res.durationMs}`);
    console.log(`  elapsedMs   : ${elapsed}`);
    console.log(`  wavFilePath : ${res.wavFilePath}`);
    console.log(`  byteLength  : ${res.byteLength}`);

    console.log('\n[WAV FORENSICS]');
    const w = parseWavDetails(res.wavFilePath!);
    console.log(`  RIFF header  : ${w.riff}`);
    console.log(`  WAVE format  : ${w.wave}`);
    console.log(`  Format code  : ${w.pcm}`);
    console.log(`  Channels     : ${w.channels}`);
    console.log(`  Sample rate  : ${w.sampleRate}`);
    console.log(`  Bits/sample  : ${w.bitsPerSample}`);
    console.log(`  Data size    : ${w.dataSize}`);
    console.log(`  Sample count : ${w.sampleCount}`);
    console.log(`  Duration     : ${w.durationSec}s`);
    console.log(`  Peak sample  : ${w.peakSample}`);
    console.log(`  RMS Energy   : ${w.rms}`);
    console.log(`  Silence state: ${w.isSilence ? 'SILENT' : 'NON-SILENT'}`);
    console.log(`  SHA-256      : ${getSha256(res.wavFilePath!)}`);
    console.log('  Notice       : WAV structural/audio-signal validation only.\n');
  }
}

main().catch(console.error);
