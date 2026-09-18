import os

html_path = 'artifacts/voice-benchmark/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

duy_oryx_html = '''
      <!-- VOICE 07 - DUY ORYX -->
      <div class="voice-card" style="border: 2px solid var(--accent-cyan); background: rgba(14, 22, 40, 0.95); margin-top: 1rem;">
        <div class="voice-header">
          <div>
            <div class="voice-title" style="color: var(--accent-cyan); font-size: 1.5rem;">🌟 7. Duy Oryx (NAM SIÊU TRẦM - CỰC ẤM & ĐIỀM ĐẠM)</div>
            <div class="voice-meta">hoangquocviet/PIPER_MODELS (duyoryx3175) • 22.05 kHz • Chất giọng nam siêu trầm, phong thái quản gia / trợ lý chững chạc</div>
          </div>
          <span class="tag-partial" style="background: rgba(0, 229, 255, 0.1); padding: 0.3rem 0.8rem; border-radius: 6px; border: 1px solid var(--accent-cyan);">ĐÃ TỔNG HỢP (4 CÂU)</span>
        </div>
        <div class="sentences-list">
          <div class="sentence-item" style="border-left: 3px solid var(--accent-cyan);">
            <div class="sentence-text-box">
              <div class="sentence-num">Câu 1</div>
              <div class="sentence-text">Xin chào Sếp. Tôi là BOWCON. Tôi đã sẵn sàng phục vụ Sếp.</div>
              <div class="sentence-metrics"><span>Thời lượng: 6.66s</span><span>Gen: 4920ms</span><span style="color: var(--accent-cyan); font-weight: 600;">(Đã phát qua tai nghe L80PRO)</span></div>
            </div>
            <div class="player-box"><audio controls preload="none" src="audio/voice-07-duy-oryx/01.wav"></audio></div>
          </div>
          <div class="sentence-item" style="border-left: 3px solid var(--accent-cyan);">
            <div class="sentence-text-box">
              <div class="sentence-num">Câu 2</div>
              <div class="sentence-text">Sếp muốn tôi kiểm tra hệ thống, mở một ứng dụng, hay thực hiện một công việc nào khác?</div>
              <div class="sentence-metrics"><span>Thời lượng: 9.13s</span><span>Gen: 5057ms</span></div>
            </div>
            <div class="player-box"><audio controls preload="none" src="audio/voice-07-duy-oryx/02.wav"></audio></div>
          </div>
          <div class="sentence-item" style="opacity: 0.6;">
            <div class="sentence-text-box">
              <div class="sentence-num" style="color: var(--status-fail);">Câu 3 — SYNTHESIS FAILED</div>
              <div class="sentence-text">Tôi đã hoàn thành yêu cầu của Sếp. Đây là kết quả mà tôi thu được.</div>
              <div class="sentence-metrics"><span style="color: var(--status-fail);">Piper exit code 1 (Lỗi phoneme)</span></div>
            </div>
            <div class="player-box"><span class="tag-failed">N/A</span></div>
          </div>
          <div class="sentence-item" style="border-left: 3px solid var(--accent-cyan);">
            <div class="sentence-text-box">
              <div class="sentence-num">Câu 4</div>
              <div class="sentence-text">Hiện tại có một số tác vụ vẫn đang được xử lý. Tôi sẽ tiếp tục theo dõi và báo lại cho Sếp khi có kết quả.</div>
              <div class="sentence-metrics"><span>Thời lượng: 11.61s</span><span>Gen: 5182ms</span></div>
            </div>
            <div class="player-box"><audio controls preload="none" src="audio/voice-07-duy-oryx/04.wav"></audio></div>
          </div>
          <div class="sentence-item" style="opacity: 0.6;">
            <div class="sentence-text-box">
              <div class="sentence-num" style="color: var(--status-fail);">Câu 5 — SYNTHESIS FAILED</div>
              <div class="sentence-text">Tôi không thể thực hiện hành động này vì quyền hạn hiện tại không cho phép.</div>
              <div class="sentence-metrics"><span style="color: var(--status-fail);">Piper exit code 1 (Lỗi phoneme)</span></div>
            </div>
            <div class="player-box"><span class="tag-failed">N/A</span></div>
          </div>
          <div class="sentence-item" style="border-left: 3px solid var(--accent-cyan);">
            <div class="sentence-text-box">
              <div class="sentence-num">Câu 6</div>
              <div class="sentence-text">Sếp có muốn tôi tiếp tục không?</div>
              <div class="sentence-metrics"><span>Thời lượng: 3.16s</span><span>Gen: 4498ms</span></div>
            </div>
            <div class="player-box"><audio controls preload="none" src="audio/voice-07-duy-oryx/06.wav"></audio></div>
          </div>
        </div>
      </div>
'''

if 'Duy Oryx' not in content:
    content = content.replace('    </div>\n\n    <footer>', duy_oryx_html + '\n    </div>\n\n    <footer>')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated index.html with Duy Oryx!')
else:
    print('Duy Oryx already in index.html')
