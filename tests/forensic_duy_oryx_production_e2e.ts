// tests/forensic_duy_oryx_production_e2e.ts
// BOWCON FINAL VOICE PIPELINE FORENSIC AUDIT — PRODUCTION PATH

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalPiperTtsEngine } from '../src/speech/piperTtsEngine.ts';
import { getBodyPsk } from '../src/core/bodyProtocol/index.ts';
import { DesktopBodyRunner } from '../bodies/desktop/index.ts';
import { DesktopAudioDriver } from '../bodies/desktop/audioDriver.ts';
import { sttEngine } from '../src/speech/sttEngine.ts';

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

  // Signal metrics calculation from actual PCM samples
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

async function runForensicAudit() {
  console.log('========================================================================');
  console.log('   BOWCON FINAL VOICE PIPELINE FORENSIC AUDIT — PRODUCTION PATH EXECUTION');
  console.log('========================================================================\n');

  // SECTION 4: CAPTURE RAW PRODUCTION TEXT
  inspectText('SENTENCE A', SENTENCE_A);
  inspectText('SENTENCE B', SENTENCE_B);

  // SECTION 9: AUDIO DEVICE INVESTIGATION BEFORE PLAYBACK
  console.log('=== AUDIO DEVICE INVESTIGATION ===');
  const audioDriver = new DesktopAudioDriver();
  const devList = await audioDriver.listAudioDevices();
  console.log('Audio Device List on current machine:');
  console.log(JSON.stringify(devList, null, 2));
  console.log('------------------------------------------------------------\n');

  // CONNECT PRODUCTION DESKTOP BODY VIA WEBSOCKET TO CENTRAL BRAIN
  const testBodyId = 'desktop_forensic_body_node';
  const psk = getBodyPsk();
  console.log(`Connecting DesktopBody "${testBodyId}" to Central Brain ws://127.0.0.1:4000/ws/body...`);
  const bodyRunner = new DesktopBodyRunner('ws://127.0.0.1:4000/ws/body', testBodyId, psk);
  await bodyRunner.start();
  await new Promise((r) => setTimeout(r, 1000));

  console.log('------------------------------------------------------------\n');

  const testCases = [
    { label: 'SENTENCE A', text: SENTENCE_A, id: 'A' },
    { label: 'SENTENCE B', text: SENTENCE_B, id: 'B' },
  ];

  const outDir = path.resolve('.tmp/forensic-e2e');
  fs.mkdirSync(outDir, { recursive: true });

  for (const tc of testCases) {
    console.log(`\n========================================================================`);
    console.log(`>>> EXECUTING PRODUCTION PIPELINE FOR: ${tc.label}`);
    console.log(`========================================================================`);

    const outWav = path.join(outDir, `prod_sent_${tc.id}.wav`);

    // STAGE 1: PRODUCTION TTS VIA PIPERTTSENGINE
    console.log('[STAGE 1: PRODUCTION TTS VIA PIPERTTSENGINE]');
    const ttsStart = Date.now();
    const piperResult = await globalPiperTtsEngine.synthesize(tc.text, {
      outputWavPath: outWav,
      returnBase64: true,
    });
    const ttsDurationMs = Date.now() - ttsStart;

    console.log('PRODUCTION TTS RESULT:');
    console.log(`  success      : ${piperResult.success}`);
    console.log(`  errorCode    : ${piperResult.errorCode}`);
    console.log(`  error        : ${piperResult.error || 'none'}`);
    console.log(`  durationMs   : ${piperResult.durationMs}ms (elapsed: ${ttsDurationMs}ms)`);
    console.log(`  wavFilePath  : ${piperResult.wavFilePath}`);
    console.log(`  byteLength   : ${piperResult.byteLength} bytes`);

    // STAGE 2: WAV FILE STRUCTURE, SIGNAL METRICS & FINGERPRINT
    console.log('\n[STAGE 2: WAV FILE STRUCTURE & SIGNAL METRICS]');
    const wavDetails = parseWavDetails(piperResult.wavFilePath!);
    console.log('WAV Metadata:');
    console.log(`  RIFF header  : ${wavDetails.riff}`);
    console.log(`  WAVE format  : ${wavDetails.wave}`);
    console.log(`  Format code  : ${wavDetails.pcm}`);
    console.log(`  Channels     : ${wavDetails.channels}`);
    console.log(`  Sample rate  : ${wavDetails.sampleRate} Hz`);
    console.log(`  Bits/sample  : ${wavDetails.bitsPerSample} bit`);
    console.log(`  Byte rate    : ${wavDetails.byteRate} bytes/sec`);
    console.log(`  Block align  : ${wavDetails.blockAlign} bytes`);
    console.log(`  Data size    : ${wavDetails.dataSize} bytes`);
    console.log(`  Sample count : ${wavDetails.sampleCount} samples`);
    console.log(`  Duration     : ${wavDetails.durationSec} seconds`);
    console.log(`  Peak sample  : ${wavDetails.peakSample} (min: ${wavDetails.minSample}, max: ${wavDetails.maxSample})`);
    console.log(`  RMS Energy   : ${wavDetails.rms} (Full scale 16-bit is 32767)`);
    console.log(`  Is Silence   : ${wavDetails.isSilence}`);
    console.log(`  Total size   : ${wavDetails.fileSizeBytes} bytes`);

    const hash = getSha256(piperResult.wavFilePath!);
    console.log(`  SHA-256      : ${hash}`);

    // STAGE 3: AUTOMATED STT VERIFICATION ATTEMPT
    console.log('\n[STAGE 3: AUTOMATED STT VERIFICATION ATTEMPT]');
    console.log(`EXPECTED_TEXT: "${tc.text}"`);
    try {
      const sttRes = await sttEngine.transcribe(piperResult.wavFilePath!, { language: 'vi' });
      console.log(`RECOGNIZED_TEXT: "${sttRes.text}"`);
      console.log(`STT Success: ${sttRes.success}`);
      if (!sttRes.success) {
        console.log(`STT Error: ${sttRes.error}`);
        console.log('Audio generation verified, semantic speech content not independently verified by automated STT.');
      }
    } catch (sttErr: any) {
      console.log(`STT Exception: ${sttErr?.message}`);
      console.log('Audio generation verified, semantic speech content not independently verified by automated STT.');
    }

    // STAGE 4: BODYPROTOCOL AUDIO.PLAY DISPATCH VIA CENTRAL SERVER
    console.log('\n[STAGE 4: BODYPROTOCOL AUDIO.PLAY DISPATCH VIA CENTRAL SERVER]');
    console.log('NOTE: THIS IS A SAME-MACHINE LOOPBACK TEST ON MACHINE A (127.0.0.1).');
    console.log('It tests Central Brain HTTP -> WebSocket -> DesktopBody routing, NOT Machine B hardware.');

    const playCommandPayload = {
      bodyId: testBodyId,
      capability: 'audio.play',
      timeoutMs: 25000,
      params: {
        audioBase64: piperResult.audioBase64,
        audioFilePath: piperResult.wavFilePath,
        format: 'wav',
      },
    };

    console.log('BODY_ACTION_REQUEST:');
    console.log(JSON.stringify({
      bodyId: playCommandPayload.bodyId,
      capability: playCommandPayload.capability,
      timeoutMs: playCommandPayload.timeoutMs,
      hasAudioBase64: !!playCommandPayload.params.audioBase64,
      audioBase64Len: playCommandPayload.params.audioBase64?.length,
      audioFilePath: playCommandPayload.params.audioFilePath,
    }, null, 2));

    const playStart = Date.now();
    const res = await fetch('http://127.0.0.1:4000/api/body/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playCommandPayload),
    });
    const roundtripElapsedMs = Date.now() - playStart;
    const bodyResultJson = await res.json();

    console.log('BODY_ACTION_RESULT:');
    console.log(JSON.stringify({
      httpStatus: res.status,
      roundtripElapsedMs,
      bodyResult: bodyResultJson,
    }, null, 2));
  }

  // SECTION 11: REPEATABILITY TEST (3 RUNS EACH FOR SENTENCE A AND B)
  console.log('\n========================================================================');
  console.log('>>> SECTION 11: REPEATABILITY TEST (3 RUNS EACH FOR SENTENCE A AND B)');
  console.log('========================================================================');

  const repeatResults: any[] = [];
  for (const tc of testCases) {
    for (let run = 1; run <= 3; run++) {
      const repPath = path.join(outDir, `repeat_${tc.id}_run${run}.wav`);
      const t0 = Date.now();
      const res = await globalPiperTtsEngine.synthesize(tc.text, {
        outputWavPath: repPath,
        returnBase64: false,
      });
      const dur = Date.now() - t0;
      const wav = parseWavDetails(repPath);
      const sha = getSha256(repPath);

      repeatResults.push({
        sentence: tc.id,
        run,
        success: res.success,
        ttsDurationMs: dur,
        byteLength: wav.fileSizeBytes,
        audioDurationSec: wav.durationSec,
        peakSample: wav.peakSample,
        rms: wav.rms,
        sha256: sha,
        error: res.error || 'none',
      });
    }
  }

  console.log('REPEATABILITY RAW RESULTS:');
  console.log(JSON.stringify(repeatResults, null, 2));

  console.log('\nStopping DesktopBodyRunner...');
  bodyRunner.stop();
  console.log('DesktopBodyRunner stopped.');
}

runForensicAudit().catch((err) => {
  console.error('FATAL AUDIT FAILURE:', err);
  process.exit(1);
});
