// scripts/echo_test_runner.mjs
import fs from 'node:fs';

const bodyId = process.argv[2] || 'desktop_xeon_desktopedffnvt';
const durationMs = Number(process.argv[3] || 3000);

async function sendCmd(capability, params = {}) {
  const res = await fetch('http://127.0.0.1:4000/api/body/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bodyId, capability, params }),
  });
  return res.json();
}

console.log(`[ECHO-TEST] 1. Dispatching audio.capture (durationMs: ${durationMs}) to ${bodyId}...`);
const captureRes = await sendCmd('audio.capture', { durationMs });
console.log('--- CAPTURE RESPONSE ---');
console.log(JSON.stringify(captureRes, null, 2));

if (!captureRes.success || !captureRes.data) {
  console.error('[ECHO-TEST] Capture failed, aborting echo play.');
  process.exit(1);
}

const audioBase64 = captureRes.data.audioBase64 || captureRes.data.data;
const buf = Buffer.from(audioBase64, 'base64');
console.log('\n--- BUFFER ANALYSIS ---');
console.log('Byte length:', buf.byteLength);
console.log('16 bytes hex:', buf.subarray(0, 16).toString('hex'));
console.log('4 bytes ascii:', buf.subarray(0, 4).toString('ascii'));

console.log(`\n[ECHO-TEST] 2. Immediately dispatching audio.play back to ${bodyId}...`);
const playRes = await sendCmd('audio.play', {
  audioBase64,
  format: captureRes.data.format || 'wav',
});
console.log('--- PLAY RESPONSE ---');
console.log(JSON.stringify(playRes, null, 2));
