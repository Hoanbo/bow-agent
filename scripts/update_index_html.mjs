// scripts/update_index_html.mjs
import fs from 'node:fs';
import path from 'node:path';

const SENTENCES = [
  "Xin chào Sếp. Tôi là BOWCON. Tôi đã sẵn sàng phục vụ Sếp.",
  "Sếp muốn tôi kiểm tra hệ thống, mở một ứng dụng, hay thực hiện một công việc nào khác?",
  "Tôi đã hoàn thành yêu cầu của Sếp. Đây là kết quả mà tôi thu được.",
  "Hiện tại có một số tác vụ vẫn đang được xử lý. Tôi sẽ tiếp tục theo dõi và báo lại cho Sếp khi có kết quả.",
  "Tôi không thể thực hiện hành động này vì quyền hạn hiện tại không cho phép.",
  "Sếp có muốn tôi tiếp tục không?"
];

const VOICES = [
  { id: 'voice-01-quang-huy', name: 'Quang Huy', repo: 'CakeByVPBank/piper-v3-vietnamese-5speakers (Speaker 2)' },
  { id: 'voice-02-thanh-nien-tu-tin', name: 'Thanh Niên Tự Tin', repo: 'vongocanhthi/acut-piper-vietnamese' },
  { id: 'voice-03-deepman-3909', name: 'Deepman 3909', repo: 'hoangquocviet/PIPER_MODELS' },
  { id: 'voice-04-manh-dung', name: 'Mạnh Dũng', repo: 'hoangquocviet/PIPER_MODELS' },
  { id: 'voice-05-minh-quang', name: 'Minh Quang', repo: 'hoangquocviet/PIPER_MODELS' },
  { id: 'voice-06-lac-phi', name: 'Lạc Phi', repo: 'hoangquocviet/PIPER_MODELS' },
  { id: 'voice-07-duy-oryx', name: 'Duy Oryx', repo: 'hoangquocviet/PIPER_MODELS' },
  { id: 'voice-08-minh-khang', name: 'Minh Khang', repo: 'hoangquocviet/PIPER_MODELS' },
];

let cardsHtml = '';
for (let vIdx = 0; vIdx < VOICES.length; vIdx++) {
  const v = VOICES[vIdx];
  let sentHtml = '';
  for (let sIdx = 0; sIdx < SENTENCES.length; sIdx++) {
    const sNum = String(sIdx + 1).padStart(2, '0');
    const wavPath = `audio/${v.id}/${sNum}.wav`;
    sentHtml += `
          <div class="sentence-item">
            <div class="sentence-text-box">
              <div class="sentence-num">Câu ${sIdx + 1}</div>
              <div class="sentence-text">${SENTENCES[sIdx]}</div>
            </div>
            <div class="player-box">
              <audio controls preload="none" src="${wavPath}"></audio>
            </div>
          </div>`;
  }

  cardsHtml += `
      <div class="voice-card" id="${v.id}">
        <div class="voice-header">
          <div>
            <div class="voice-title">${vIdx + 1}. ${v.name}</div>
            <div class="voice-meta">${v.repo} • 22.05 kHz • Chuẩn tiếng Việt UTF-8</div>
          </div>
        </div>
        <div class="sentences-list">
          ${sentHtml}
        </div>
      </div>`;
}

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BOWCON — Vietnamese Male Voice Benchmark Lab</title>
  <style>
    :root {
      --bg-primary: #0a0d14;
      --bg-card: rgba(22, 28, 45, 0.85);
      --border-color: rgba(255, 255, 255, 0.12);
      --accent-cyan: #00e5ff;
      --text-main: #f0f4f8;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: linear-gradient(135deg, #07090e 0%, #0d1322 100%);
      color: var(--text-main);
      padding: 2.5rem 1.5rem;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header { margin-bottom: 2.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem; }
    .badge {
      display: inline-block; padding: 0.35rem 0.8rem; font-size: 0.75rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; border-radius: 999px;
      background: rgba(0, 229, 255, 0.12); color: var(--accent-cyan);
      border: 1px solid rgba(0, 229, 255, 0.3); margin-bottom: 0.75rem;
    }
    h1 { font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem; }
    p.subtitle { color: var(--text-muted); font-size: 1rem; line-height: 1.5; }
    .voices-grid { display: flex; flex-direction: column; gap: 2rem; }
    .voice-card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 14px; padding: 1.75rem; backdrop-filter: blur(12px);
    }
    .voice-card:hover { border-color: rgba(0, 229, 255, 0.4); }
    .voice-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;
    }
    .voice-title { font-size: 1.35rem; font-weight: 700; color: #fff; }
    .voice-meta { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem; }
    .sentences-list { display: flex; flex-direction: column; gap: 1rem; }
    .sentence-item {
      background: rgba(10, 14, 25, 0.6); border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px; padding: 0.85rem 1.25rem; display: flex; align-items: center;
      justify-content: space-between; gap: 1.5rem; border-left: 3px solid var(--accent-cyan);
    }
    .sentence-text-box { flex: 1; }
    .sentence-num { font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 0.25rem; }
    .sentence-text { font-size: 0.95rem; color: #fff; line-height: 1.4; }
    .player-box { width: 320px; display: flex; justify-content: flex-end; }
    audio { width: 100%; height: 38px; outline: none; }
    footer { margin-top: 3.5rem; text-align: center; font-size: 0.85rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">Audition Station • 100% Vietnamese UTF-8</div>
      <h1>BOWCON — Vietnamese Male Voice Benchmark Lab</h1>
      <p class="subtitle">Phòng thí nghiệm đối chuẩn 8 giọng đọc nam tiếng Việt thật qua Piper TTS. Toàn bộ audio đã được tổng hợp lại bằng mã hóa UTF-8 chuẩn xác.</p>
    </header>

    <div class="voices-grid">
      ${cardsHtml}
    </div>

    <footer>
      BOWCON Voice Benchmark Lab • 8 Giọng Nam Tiếng Việt Đã Chuẩn Hóa UTF-8 • 2026
    </footer>
  </div>
</body>
</html>`;

fs.writeFileSync(path.resolve('artifacts/voice-benchmark/index.html'), html, 'utf8');
console.log('Successfully updated artifacts/voice-benchmark/index.html!');
