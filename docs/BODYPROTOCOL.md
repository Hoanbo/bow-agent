# BOWCON — BODYPROTOCOL SPECIFICATION V4.0
**Authoritative Architectural Specification | Antigravity AI Systems Architecture**  
**Protocol Version:** 4.0.0  
**Transport:** WebSocket (`ws://<brain_host>:<brain_port>/ws/body`)  
**Security:** Pre-Shared Key (PSK) Bearer Handshake + PDP Level 1-4 Governance  
**Bilingual Standard:** English Technical Specification & Tiếng Việt Giải Thích Kiến Trúc

---

## 1. Overview (Tổng Quan)

**EN:** BodyProtocol establishes a bidirectional, authenticated, capability-driven control and sensory bridge between the Central Brain (`bow-agent`) and distributed peripheral Bodies (`desktop`, `mobile`, `robot`). The Brain is pure cognitive intelligence, decision making, memory, and policy governance; the Body is physical actuation, hardware input/output, and sensory capture.

**VI:** BodyProtocol thiết lập cây cầu điều khiển và cảm biến hai chiều, được xác thực và định hướng theo năng lực (capabilities) giữa Não Bộ Trung Tâm (`bow-agent`) và các Thể Xác ngoại vi (`desktop`, `mobile`, `robot`). Não bộ thuần túy là trí tuệ nhận thức, ra quyết định, lưu trữ ký ức và kiểm soát chính sách; Thể xác là cơ cấu thực thi vật lý, xuất/nhập phần cứng và thu thập cảm giác.

---

## 2. Authentication & Handshake (Xác Thực & Bắt Tay)

### 2.1 Handshake Invariants
* Endpoint: `/ws/body`
* Headers required:
  ```http
  Authorization: Bearer <BOW_BODY_PSK>
  ```
* Handshake Rules:
  1. Requests without `Authorization` header are rejected with `HTTP 401 Unauthorized`.
  2. Requests with an invalid or tampered PSK are rejected with `HTTP 401 Unauthorized`.
  3. Rejected connections are terminated immediately at the HTTP server level and **NEVER** enter `BodyRegistry`.
  4. Peripheral bodies cannot claim privileged roles (e.g. `role: owner`). Authorization context is strictly issued by the Brain.

---

## 3. Standard Protocol Envelopes (Chuẩn Hóa Khung Thông Điệp)

### 3.1 Registration & Capabilities (`body.capabilities`)
Dispatched immediately by the Body upon successful WebSocket connection:
```json
{
  "type": "body.capabilities",
  "bodyId": "desktop_xeon_msi",
  "bodyType": "desktop",
  "name": "PC Xeon Desktop Body (MSI)",
  "capabilities": [
    {
      "name": "audio.capture",
      "version": "1.0.0",
      "description": "Thu âm thanh từ micro tai nghe thật ra buffer WAV 16-bit PCM",
      "inputSchema": {
        "type": "object",
        "properties": {
          "durationMs": { "type": "number", "default": 2000 },
          "sampleRate": { "type": "number", "default": 16000 },
          "channels": { "type": "number", "default": 1 }
        }
      }
    },
    {
      "name": "audio.play",
      "version": "1.0.0",
      "description": "Phát âm thanh ra loa hoặc tai nghe phần cứng thật",
      "inputSchema": {
        "type": "object",
        "properties": {
          "audioBase64": { "type": "string" },
          "format": { "type": "string", "default": "wav" }
        }
      }
    }
  ],
  "metadata": {
    "hostname": "MSI_dualXeon",
    "os": "Windows_NT"
  }
}
```

### 3.2 Command Envelope (`body.command`)
Dispatched by the Central Brain to a specific Body:
```json
{
  "type": "body.command",
  "commandId": "cmd_1789656153625_q2yve",
  "correlationId": "voice_corr_1789656153000_a8f9",
  "bodyId": "desktop_xeon_msi",
  "capability": "audio.capture",
  "params": {
    "durationMs": 1500,
    "sampleRate": 16000,
    "channels": 1
  },
  "timeoutMs": 15000,
  "issuedAt": 1789656153625
}
```

### 3.3 Command Result Envelope (`body.result`)
Returned by the Body to the Brain upon execution completion:
```json
{
  "type": "body.result",
  "commandId": "cmd_1789656153625_q2yve",
  "correlationId": "voice_corr_1789656153000_a8f9",
  "bodyId": "desktop_xeon_msi",
  "success": true,
  "data": {
    "format": "wav",
    "sampleRate": 16000,
    "channels": 1,
    "byteLength": 24044,
    "audioBase64": "UklGRiS3..."
  },
  "executionTimeMs": 4708
}
```

### 3.4 Event Envelope (`body.event`)
Asynchronous telemetry or streaming events from the Body:
```json
{
  "type": "body.event",
  "id": "evt_1789656153630",
  "correlationId": "voice_corr_1789656153000_a8f9",
  "bodyId": "desktop_xeon_msi",
  "capability": "audio.capture",
  "payload": {
    "status": "recording_started",
    "timestamp": 1789656153630
  },
  "timestamp": 1789656153630
}
```

### 3.5 Heartbeat (`body.heartbeat`)
Heartbeats sent every 5,000ms by the Body to prevent timeout eviction (stale threshold: 15,000ms):
```json
{
  "type": "body.heartbeat",
  "bodyId": "desktop_xeon_msi",
  "timestamp": 1789656158000
}
```

---

## 4. Audio Body Capabilities (Năng Lực Âm Thanh Của Body)

| Capability | Purpose | Input Parameters | Output Data |
| :--- | :--- | :--- | :--- |
| `audio.device.list` | Enumerate input/output hardware audio devices | `{}` | `{ inputs: AudioDeviceDescriptor[], outputs: AudioDeviceDescriptor[], activeInput, activeOutput }` |
| `audio.status` | Query audio driver health & active devices | `{}` | `{ ready: boolean, activeInput, activeOutput, isCapturing, isPlaying, defaultSampleRate }` |
| `audio.device.select` | Switch active microphone or speaker | `{ type: "input" \| "output", name: string }` | `{ selected: boolean, type, name }` |
| `audio.capture` | Record microphone audio | `{ durationMs?: number, sampleRate?: number, channels?: number }` | `{ audioBase64: string, format: "wav", durationMs, sampleRate, channels, byteLength }` |
| `audio.play` | Playback audio through speakers or headset | `{ audioBase64?: string, audioFilePath?: string, format?: "wav" }` | `{ success: boolean, playbackDurationMs: number, deviceName: string }` |

---

## 5. End-to-End Voice Pipeline Architecture

```text
HEADSET MICROPHONE
       ↓
(Body Capability: audio.capture via Windows MCI/WinMM)
       ↓
Base64 16-bit WAV PCM
       ↓
Speech-To-Text (STT Engine)
       ↓
Transcribed Text
       ↓
CANONICAL AGENTLOOP
[Intent → Memory → Plan → PDP → Execute → Verify → Update]
       ↓
Response Text
       ↓
Text-To-Speech (TTS Engine / System.Speech)
       ↓
Synthesized WAV Buffer
       ↓
(Body Capability: audio.play via .NET SoundPlayer)
       ↓
HEADSET SPEAKERS
```

### Zero-Bypass PDP Enforcement
* Voice is strictly an I/O sensory transport; it is **never** granted a privileged execution shortcut.
* High-impact actions requested via voice (e.g. "Mở Notepad", "Chạy script...") trigger standard PDP Level 4 human-in-the-loop verification requiring an explicit approval token from the Ultimate Operator.

### Privacy & Audit Ledger Guarantees
* **Zero Raw Audio Leakage:** Raw microphone recordings and audio binaries are strictly prohibited from entering the cryptographic audit ledger (`globalAuditLedger`).
* Only cryptographic hashes of stage metadata (`argumentsHash`) and audit event identifiers (`AUDIO_CAPTURE_STARTED`, `AUDIO_CAPTURE_COMPLETED`, `AGENT_REQUEST`, `AUDIO_PLAY_COMPLETED`) are recorded.
