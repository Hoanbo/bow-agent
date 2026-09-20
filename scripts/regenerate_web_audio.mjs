// scripts/regenerate_web_audio.mjs
import path from 'node:path';
import fs from 'node:fs';
import { PiperTtsEngine } from '../src/speech/piperTtsEngine.ts';

const SENTENCES = [
  "Xin chào Sếp. Tôi là BOWCON. Tôi đã sẵn sàng phục vụ Sếp.",
  "Sếp muốn tôi kiểm tra hệ thống, mở một ứng dụng, hay thực hiện một công việc nào khác?",
  "Tôi đã hoàn thành yêu cầu của Sếp. Đây là kết quả mà tôi thu được.",
  "Hiện tại có một số tác vụ vẫn đang được xử lý. Tôi sẽ tiếp tục theo dõi và báo lại cho Sếp khi có kết quả.",
  "Tôi không thể thực hiện hành động này vì quyền hạn hiện tại không cho phép.",
  "Sếp có muốn tôi tiếp tục không?"
];

const VOICES = [
  {
    id: 'voice-01-quang-huy',
    name: 'Quang Huy',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-01-quang-huy/vi_VN-csa-voice-piper-v3-medium.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-01-quang-huy/vi_VN-csa-voice-piper-v3-medium.onnx.json'),
    speakerId: 2,
  },
  {
    id: 'voice-02-thanh-nien-tu-tin',
    name: 'Thanh Niên Tự Tin',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-02-thanh-nien-tu-tin/vi_VN-thanh_nien_tu_tin-medium.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-02-thanh-nien-tu-tin/vi_VN-thanh_nien_tu_tin-medium.onnx.json'),
  },
  {
    id: 'voice-03-deepman-3909',
    name: 'Deepman 3909',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-03-deepman-3909/deepman3909.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-03-deepman-3909/deepman3909.onnx.json'),
  },
  {
    id: 'voice-04-manh-dung',
    name: 'Mạnh Dũng',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-04-manh-dung/manhdung.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-04-manh-dung/manhdung.onnx.json'),
  },
  {
    id: 'voice-05-minh-quang',
    name: 'Minh Quang',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-05-minh-quang/minhquang.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-05-minh-quang/minhquang.onnx.json'),
  },
  {
    id: 'voice-06-lac-phi',
    name: 'Lạc Phi',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-06-lac-phi/lacphi.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-06-lac-phi/lacphi.onnx.json'),
  },
  {
    id: 'voice-07-duy-oryx',
    name: 'Duy Oryx',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-07-duy-oryx/duyoryx3175.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-07-duy-oryx/duyoryx3175.onnx.json'),
  },
  {
    id: 'voice-08-minh-khang',
    name: 'Minh Khang',
    modelPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-08-minh-khang/minhkhang.onnx'),
    configPath: path.resolve('artifacts/voice-benchmark/models-cache/voice-08-minh-khang/minhkhang.onnx.json'),
  },
];

console.log('Regenerating benchmark audio files with UTF-8...');

for (const voice of VOICES) {
  const outDir = path.resolve('artifacts/voice-benchmark/audio', voice.id);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const engine = new PiperTtsEngine({
    modelPath: voice.modelPath,
    configPath: voice.configPath,
  });

  console.log(`\nProcessing: ${voice.name} (${voice.id})...`);

  for (let i = 0; i < SENTENCES.length; i++) {
    const sentNum = String(i + 1).padStart(2, '0');
    const outWav = path.join(outDir, `${sentNum}.wav`);
    const sentence = SENTENCES[i];

    try {
      const res = await engine.synthesize(sentence, {
        outputWavPath: outWav,
        speakerId: voice.speakerId,
        returnBase64: false,
      });
      if (res.success) {
        console.log(`  [OK] Sentence ${sentNum}: ${res.byteLength} bytes (${res.durationMs}ms)`);
      } else {
        console.warn(`  [SKIP] Sentence ${sentNum} phoneme mismatch: ${res.error}`);
      }
    } catch (err) {
      console.warn(`  [ERR] Sentence ${sentNum}: ${err.message}`);
    }
  }
}

console.log('\nAudio regeneration complete!');
