// tests/test_duy_oryx_benchmark.ts
// Benchmark Duy Oryx model with standalone piper.exe on the 6 standard Vietnamese test sentences

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PIPER_EXE = path.resolve('bin/piper/piper.exe');
const MODEL_PATH = path.resolve('artifacts/voice-benchmark/models-cache/voice-07-duy-oryx/duyoryx3175.onnx');
const CONFIG_PATH = path.resolve('artifacts/voice-benchmark/models-cache/voice-07-duy-oryx/duyoryx3175.onnx.json');
const OUT_DIR = path.resolve('.tmp/benchmark-audio');

const BENCHMARK_SENTENCES = [
  'Xin chào Sếp. Tôi là BOWCON. Tôi đã sẵn sàng phục vụ Sếp.',
  'Sếp muốn tôi kiểm tra hệ thống hay thực hiện một công việc nào khác?',
  'Tôi đã hoàn thành yêu cầu của Sếp. Đây là kết quả mà tôi thu được.',
  'Hiện tại có một số tác vụ vẫn đang được xử lý. Tôi sẽ tiếp tục theo dõi.',
  'Tôi không thể thực hiện hành động này vì quyền hạn hiện tại không cho phép.',
  'Sếp có muốn tôi tiếp tục không?',
];

interface BenchmarkResult {
  index: number;
  text: string;
  success: boolean;
  durationMs: number;
  wavBytes?: number;
  wavPath?: string;
  error?: string;
}

export async function synthesizeWithPiper(
  text: string,
  outPath: string
): Promise<{ success: boolean; durationMs: number; bytes?: number; error?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn(
      PIPER_EXE,
      ['--model', MODEL_PATH, '--config', CONFIG_PATH, '--output_file', outPath],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        durationMs: Date.now() - start,
        error: `Spawn error: ${err.message}`,
      });
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - start;
      if (code === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 100) {
        resolve({
          success: true,
          durationMs,
          bytes: fs.statSync(outPath).size,
        });
      } else {
        resolve({
          success: false,
          durationMs,
          error: `Exit code ${code}. Stderr: ${stderr.trim()}`,
        });
      }
    });

    // Write text encoded in UTF-8
    child.stdin.write(text, 'utf8');
    child.stdin.end();
  });
}

async function run() {
  console.log('============================================================');
  console.log('       DUY ORYX PIPER STANDALONE BENCHMARK (6 SENTENCES)    ');
  console.log('============================================================');
  console.log(`Piper binary : ${PIPER_EXE}`);
  console.log(`Model path   : ${MODEL_PATH}`);
  console.log(`Config path  : ${CONFIG_PATH}`);
  console.log('------------------------------------------------------------\n');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const results: BenchmarkResult[] = [];
  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < BENCHMARK_SENTENCES.length; i++) {
    const text = BENCHMARK_SENTENCES[i];
    const outPath = path.join(OUT_DIR, `sentence_${i + 1}.wav`);
    console.log(`[${i + 1}/6] Synthesizing: "${text}"`);

    const res = await synthesizeWithPiper(text, outPath);
    const item: BenchmarkResult = {
      index: i + 1,
      text,
      success: res.success,
      durationMs: res.durationMs,
      wavBytes: res.bytes,
      wavPath: res.success ? outPath : undefined,
      error: res.error,
    };
    results.push(item);

    if (res.success) {
      passCount++;
      console.log(`      -> PASS (${res.durationMs}ms, ${res.bytes} bytes)`);
    } else {
      failCount++;
      console.log(`      -> FAILED (${res.durationMs}ms): ${res.error}`);
    }
  }

  console.log('\n============================================================');
  console.log(`BENCHMARK SUMMARY: PASS ${passCount}/6 | FAILED ${failCount}/6`);
  console.log('============================================================');

  if (failCount > 0) {
    console.log('\nDETAILS OF FAILURES:');
    for (const r of results.filter((r) => !r.success)) {
      console.log(`Sentence ${r.index}: "${r.text}"`);
      console.log(`Error: ${r.error}\n`);
    }
  }
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  run().catch(console.error);
}
