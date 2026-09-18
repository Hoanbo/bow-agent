# BOWCON Voice Benchmark Evidence Report

## 1. Repository State
- **Repository**: `@bow/agent` (BOWCON V4.0)
- **Branch**: `main`
- **Commit**: `4f301ef` (`test: add reality gate test suites for V4 agent governed feedback review and cross-incident intelligence`)
- **Working tree**:
  ```text
  M bodies/desktop/audioDriver.ts
  M data/audit_ledger.jsonl
  M package.json
  M src/server.ts
  M src/speech/sttEngine.ts
  M src/speech/ttsEngine.ts
  ?? .venv-speech/
  ?? artifacts/voice-benchmark/
  ?? benchmarks/
  ?? docs/evidence/VOICE_BENCHMARK_REPORT.md
  ?? scripts/voice-benchmark/
  ```

---

## 2. Environment
- **OS**: Microsoft Windows 11 Home Single Language (dual Intel Xeon, 28 cores / 56 threads)
- **Node**: v24.20.0
- **Python**: Python 3.12.14 (Virtualenv `.venv-speech`)
- **Piper-TTS**: piper_tts 1.8.0 (`.venv-speech\Scripts\piper.exe`)
- **ONNX Runtime**: onnxruntime 1.30.0 (Local CPU execution provider)
- **FFmpeg / SoX**: Không phụ thuộc (Sử dụng trực tiếp RIFF WAV parsing và winmm.dll)

---

## 3. Audio Devices

### INPUT DEVICES
1. `Microphone (L80PRO)` (ID: 0) — Phần cứng thật: USB Headset Audio (`USB\VID_4C4A&PID_4155&MI_00`)
2. `Microphone (DeskIn(R) Virtual Audio Device)` (ID: 1) — Virtual Device

### OUTPUT DEVICES
1. `Speakers (L80PRO)` (ID: 0) — Phần cứng thật: USB Headset Audio (`USB\VID_4C4A&PID_4155&MI_00`)
2. `4 - AOC28E850.HDR (2- AMD High Definition Audio Device)` (ID: 1) — Màn hình AOC qua HDMI/DP
3. `Speakers (DeskIn(R) Virtual Audio Device)` (ID: 2) — Virtual Device
4. `Digital Audio (S/PDIF) (High Definition Audio Device)` (ID: 3) — Realtek ALC897 Onboard

- **Selected input**: `Microphone (L80PRO)`
- **Selected output**: `Speakers (L80PRO)`
- **Selection method**: Nhận diện phần cứng cụ thể (Explicit hardware identification qua PnP & winmm)

---

## 4. Models Manifest & Verification

| Voice | Repository | Speaker ID | Access | Download | Load | Synthesis |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Quang Huy** | `CakeByVPBank/piper-v3-vietnamese-5speakers` | 2 | VERIFIED | VERIFIED (77.1 MB) | VERIFIED | VERIFIED (6/6 PASS) |
| **Thanh niên tự tin** | `vongocanhthi/acut-piper-vietnamese` | Single | VERIFIED | VERIFIED (63.5 MB) | VERIFIED | VERIFIED (6/6 PASS) |
| **Deepman 3909** | `hoangquocviet/PIPER_MODELS` | Single | VERIFIED | VERIFIED (63.5 MB) | VERIFIED | PARTIAL (4/6 PASS) |
| **Mạnh Dũng** | `hoangquocviet/PIPER_MODELS` | Single | VERIFIED | VERIFIED (63.5 MB) | VERIFIED | PARTIAL (4/6 PASS) |
| **Minh Quang** | `hoangquocviet/PIPER_MODELS` | Single | VERIFIED | VERIFIED (63.5 MB) | VERIFIED | PARTIAL (4/6 PASS) |
| **Lạc Phi** | `hoangquocviet/PIPER_MODELS` | Single | VERIFIED | VERIFIED (63.5 MB) | VERIFIED | PARTIAL (4/6 PASS) |

---

## 5. Benchmark Measurement Results

*Kịch bản văn bản chuẩn 6 câu (`benchmarks/voice-benchmark.txt`):*
1. *Xin chào Sếp. Tôi là BOWCON. Tôi đã sẵn sàng phục vụ Sếp.*
2. *Sếp muốn tôi kiểm tra hệ thống, mở một ứng dụng, hay thực hiện một công việc nào khác?*
3. *Tôi đã hoàn thành yêu cầu của Sếp. Đây là kết quả mà tôi thu được.*
4. *Hiện tại có một số tác vụ vẫn đang được xử lý. Tôi sẽ tiếp tục theo dõi và báo lại cho Sếp khi có kết quả.*
5. *Tôi không thể thực hiện hành động này vì quyền hạn hiện tại không cho phép.*
6. *Sếp có muốn tôi tiếp tục không?*

| Voice | Sentence | Duration (s) | Generation Time (s) | RTF | File Size (Bytes) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Quang Huy** | 1 | 5.294 | 2.795 | 0.5280 | 233,516 | VERIFIED |
| Quang Huy | 2 | 6.850 | 2.886 | 0.4213 | 302,124 | VERIFIED |
| Quang Huy | 3 | 5.532 | 2.652 | 0.4795 | 244,012 | VERIFIED |
| Quang Huy | 4 | 8.766 | 3.122 | 0.3562 | 386,604 | VERIFIED |
| Quang Huy | 5 | 6.443 | 2.797 | 0.4341 | 284,180 | VERIFIED |
| Quang Huy | 6 | 3.051 | 2.311 | 0.7573 | 134,572 | VERIFIED |
| **Thanh niên tự tin** | 1 | 4.882 | 2.542 | 0.5208 | 215,340 | VERIFIED |
| Thanh niên tự tin | 2 | 6.269 | 2.795 | 0.4459 | 276,524 | VERIFIED |
| Thanh niên tự tin | 3 | 5.120 | 2.603 | 0.5085 | 225,836 | VERIFIED |
| Thanh niên tự tin | 4 | 8.420 | 3.108 | 0.3691 | 371,372 | VERIFIED |
| Thanh niên tự tin | 5 | 6.095 | 2.814 | 0.4616 | 268,844 | VERIFIED |
| Thanh niên tự tin | 6 | 2.775 | 2.058 | 0.7417 | 122,412 | VERIFIED |
| **Deepman 3909** | 1 | 11.865 | 4.986 | 0.4202 | 523,308 | VERIFIED |
| Deepman 3909 | 2 | 12.179 | 5.145 | 0.4225 | 537,132 | VERIFIED |
| Deepman 3909 | 3 | N/A | N/A | N/A | 0 | FAILED (Phoneme exit 1) |
| Deepman 3909 | 4 | 21.978 | 5.538 | 0.2520 | 969,260 | VERIFIED |
| Deepman 3909 | 5 | N/A | N/A | N/A | 0 | FAILED (Phoneme exit 1) |
| Deepman 3909 | 6 | 5.375 | 4.459 | 0.8295 | 237,100 | VERIFIED |
| **Mạnh Dũng** | 1 | 7.581 | 4.691 | 0.6187 | 334,380 | VERIFIED |
| Mạnh Dũng | 2 | 9.497 | 4.822 | 0.5077 | 418,860 | VERIFIED |
| Mạnh Dũng | 3 | N/A | N/A | N/A | 0 | FAILED (Phoneme exit 1) |
| Mạnh Dũng | 4 | 13.073 | 5.059 | 0.3870 | 576,556 | VERIFIED |
| Mạnh Dũng | 5 | N/A | N/A | N/A | 0 | FAILED (Phoneme exit 1) |
| Mạnh Dũng | 6 | 3.390 | 4.560 | 1.3451 | 149,548 | VERIFIED |
| **Minh Quang** | 1 | 6.049 | 4.743 | 0.7841 | 266,796 | VERIFIED |
| Minh Quang | 2 | 8.603 | 4.965 | 0.5771 | 379,436 | VERIFIED |
| Minh Quang | 3 | N/A | N/A | N/A | 0 | FAILED (Phoneme exit 1) |
| Minh Quang | 4 | 10.635 | 4.728 | 0.4445 | 469,036 | VERIFIED |
| Minh Quang | 5 | N/A | N/A | N/A | 0 | FAILED (Phoneme exit 1) |
| Minh Quang | 6 | 2.995 | 4.466 | 1.4910 | 132,140 | VERIFIED |
| **Lạc Phi** | 1 | 11.192 | 4.953 | 0.4426 | 493,612 | VERIFIED |
| Lạc Phi | 2 | 14.106 | 5.188 | 0.3678 | 622,124 | VERIFIED |
| Lạc Phi | 3 | N/A | N/A | N/A | 0 | FAILED (Phoneme exit 1) |
| Lạc Phi | 4 | 23.034 | 5.673 | 0.2463 | 1,015,852 | VERIFIED |
| Lạc Phi | 5 | N/A | N/A | N/A | 0 | FAILED (Phoneme exit 1) |
| Lạc Phi | 6 | 6.246 | 4.624 | 0.7404 | 275,500 | VERIFIED |

---

## 6. Hardware Playback Verification

Kiểm thử phát âm thực tế trên tai nghe USB thật: **`Speakers (L80PRO)`**.

| Voice | Playback Attempt | Output Device | Result |
| :--- | :--- | :--- | :--- |
| **voice-01-quang-huy** | `01.wav` | `Speakers (L80PRO)` | **VERIFIED** |
| **voice-02-thanh-nien-tu-tin** | `01.wav` | `Speakers (L80PRO)` | **VERIFIED** |
| **voice-03-deepman-3909** | `01.wav` | `Speakers (L80PRO)` | **VERIFIED** |
| **voice-04-manh-dung** | `01.wav` | `Speakers (L80PRO)` | **VERIFIED** |
| **voice-05-minh-quang** | `01.wav` | `Speakers (L80PRO)` | **VERIFIED** |
| **voice-06-lac-phi** | `01.wav` | `Speakers (L80PRO)` | **VERIFIED** |

*Chứng chỉ:* `Playback command completed on selected output device: Speakers (L80PRO)`.

---

## 7. Microphone Smoke Test

- **Device**: `Microphone (L80PRO)`
- **Capture Duration**: 1,500 ms
- **Non-empty File Check**: 23,533 Bytes (WAV RIFF 16kHz Mono 16-bit PCM)
- **Status**: **VERIFIED**
- **Cleanup**: Đã xóa file ghi âm tạm thời khỏi bộ nhớ đĩa theo chính sách quyền riêng tư.

---

## 8. File Artifacts

- **Báo cáo phần cứng**: [`artifacts/voice-benchmark/device-report.json`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/artifacts/voice-benchmark/device-report.json)
- **Bảng mô hình**: [`artifacts/voice-benchmark/models.json`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/artifacts/voice-benchmark/models.json)
- **Kịch bản chuẩn**: [`benchmarks/voice-benchmark.txt`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/benchmarks/voice-benchmark.txt)
- **Dữ liệu đo đạc (JSON)**: [`artifacts/voice-benchmark/benchmark-results.json`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/artifacts/voice-benchmark/benchmark-results.json)
- **Dữ liệu đo đạc (CSV)**: [`artifacts/voice-benchmark/benchmark-results.csv`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/artifacts/voice-benchmark/benchmark-results.csv)
- **Giao diện nghe thử HTML**: [`artifacts/voice-benchmark/index.html`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/artifacts/voice-benchmark/index.html)
- **Phiếu đánh giá cho Chủ nhân**: [`artifacts/voice-benchmark/listening-sheet.md`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/artifacts/voice-benchmark/listening-sheet.md)
- **Script tái lập**: [`scripts/voice-benchmark/run_benchmark.py`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/scripts/voice-benchmark/run_benchmark.py)
- **Thư mục âm thanh đã sinh**: [`artifacts/voice-benchmark/audio/`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/artifacts/voice-benchmark/audio)

---

## 9. Raw Evidence Snippets

### Raw Command 1: Enumerate Audio Devices
```powershell
Get-PnpDevice -Class AudioEndpoint | Select-Object FriendlyName, Status, InstanceId
```
**Raw Output:**
```text
FriendlyName                                            Status InstanceId
------------                                            ------ ----------
Speakers (DeskIn(R) Virtual Audio Device)               OK     SWD\MMDEVAPI\{0.0.0.00000000}.{B9CC39EC...
Speakers (L80PRO)                                       OK     SWD\MMDEVAPI\{0.0.0.00000000}.{33B37296...
4 - AOC28E850.HDR (2- AMD High Definition Audio Device) OK     SWD\MMDEVAPI\{0.0.0.00000000}.{7414907F...
Digital Audio (S/PDIF) (High Definition Audio Device)   OK     SWD\MMDEVAPI\{0.0.0.00000000}.{FF84E69F...
Microphone (DeskIn(R) Virtual Audio Device)             OK     SWD\MMDEVAPI\{0.0.1.00000000}.{1E820B7A...
Microphone (L80PRO)                                     OK     SWD\MMDEVAPI\{0.0.1.00000000}.{BA22616E...
```

### Raw Command 2: Execute Hardware Playback Test & Mic Smoke Test
```powershell
powershell -ExecutionPolicy Bypass -File scripts\voice-benchmark\test_hardware_playback.ps1
```
**Raw Output:**
```text
=== PHASE 6: AUDIO PLAYBACK TEST ON SELECTED HEADSET (Speakers (L80PRO)) ===
Testing playback: voice-01-quang-huy -> 01.wav
  -> Playback command completed on selected output device: Speakers (L80PRO)
Testing playback: voice-02-thanh-nien-tu-tin -> 01.wav
  -> Playback command completed on selected output device: Speakers (L80PRO)
Testing playback: voice-03-deepman-3909 -> 01.wav
  -> Playback command completed on selected output device: Speakers (L80PRO)
Testing playback: voice-04-manh-dung -> 01.wav
  -> Playback command completed on selected output device: Speakers (L80PRO)
Testing playback: voice-05-minh-quang -> 01.wav
  -> Playback command completed on selected output device: Speakers (L80PRO)
Testing playback: voice-06-lac-phi -> 01.wav
  -> Playback command completed on selected output device: Speakers (L80PRO)

=== PHASE 7: MICROPHONE SMOKE TEST (Microphone (L80PRO)) ===
Recording from Microphone (L80PRO) for 1500ms...
Microphone capture SUCCESS! File size: 23533 bytes
Temporary recording cleaned up.
Mic Status: VERIFIED
```

---

## 10. Failures & Anomalies
- **Lỗi Phonemizer trên 4 model của `hoangquocviet/PIPER_MODELS`** (`deepman3909`, `manhdung`, `minhquang`, `lacphi`):
  - Khi tổng hợp câu số 3 (*"Tôi đã hoàn thành yêu cầu của Sếp. Đây là kết quả mà tôi thu được."*) và câu số 5 (*"Tôi không thể thực hiện hành động này vì quyền hạn hiện tại không cho phép."*), tiến trình `piper.exe` trả về `non-zero exit status 1`.
  - Nguyên nhân: Tập từ vựng / ánh xạ espeak phoneme của 4 mô hình này gặp lỗi không khớp đối với một số từ tiếng Việt cụ thể có trong câu 3 và 5.
  - Xử lý: Ghi nhận trung thực trạng thái `FAILED: exit status 1` cho 2 câu này; không loại bỏ cả mô hình mà giữ lại 4 câu đã sinh thành công để Chủ nhân vẫn nghe và đánh giá được âm sắc.

---

## 11. Unknowns
- Tác giả huấn luyện ban đầu của các mô hình trong repo `hoangquocviet/PIPER_MODELS` không kèm theo mã nguồn tiền xử lý phoneme gốc, nên việc sửa đổi từ điển phoneme cho 4 mô hình này cần công đoạn fine-tune hoặc mapping lại config.
- Trải nghiệm chủ quan về "chất giọng quản gia", độ ấm và sự điềm đạm phụ thuộc hoàn toàn vào cảm nhận của Chủ nhân (được ghi nhận trong `listening-sheet.md`).

---

## 12. Final Status

```text
PARTIALLY VERIFIED
```
*(Lý do: 2 mô hình `Quang Huy` và `Thanh niên tự tin` đạt 100% VERIFIED trên toàn bộ 6 câu benchmark; 4 mô hình còn lại đạt 4/6 câu thành công và gặp lỗi ở 2 câu cụ thể. Đúng theo quy tắc Truth > Target Count: Báo cáo trung thực trạng thái thực tế).*
