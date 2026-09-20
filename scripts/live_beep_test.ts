// scripts/live_beep_test.ts
// BOWCON V4.0 — LIVE HARDWARE PRIVACY BEEP DEMO
import { desktopAudioDriver } from '../bodies/desktop/audioDriver.js';

async function main() {
  console.log('================================================================');
  console.log('🔊 CHẠY THỬ NGHIỆM THỰC TẾ: CHỈ BÁO BEEP VẬT LÝ TRÊN WINDOWS');
  console.log('================================================================');
  console.log('[1] Bạn sẽ nghe thấy 1 tiếng BEEP CAO (1200Hz) báo hiệu MIC BẮT ĐẦU THU...');
  
  const start = Date.now();
  const res = await desktopAudioDriver.recordAudio({ durationMs: 1500 });
  
  console.log('[2] ...và 1 tiếng BEEP TRẦM (600Hz) báo hiệu MIC ĐÃ ĐÓNG KẾT THÚC!');
  console.log(`[PASS] Hoàn tất thu âm: ${res.byteLength} bytes WAV trong ${Date.now() - start}ms.`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Lỗi chạy thử:', err);
  process.exit(1);
});
