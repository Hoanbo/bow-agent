// src/adapters/robotAdapter.ts
// BOW AGENT V3.3 — ROBOT CHANNEL ADAPTER (bow-robot 2-Way Audio/OLED/Servo Gateway)
import { processAgentMessage } from '../core/engine.js';
import { ttsEngine } from '../speech/ttsEngine.js';
import { sttEngine } from '../speech/sttEngine.js';
export class RobotChannelAdapter {
    online = true;
    currentSensors = {
        batteryPercent: 95,
        isCharging: false,
        temperatureCelsius: 36.5,
        obstaclesDetected: false,
        activeSensors: ['ultrasonic', 'imu', 'microphone', 'oled_eye'],
        timestamp: new Date().toISOString(),
    };
    isOnline() {
        return this.online;
    }
    updateSensorState(snapshot) {
        this.currentSensors = {
            ...this.currentSensors,
            ...snapshot,
            timestamp: new Date().toISOString(),
        };
    }
    async getSensorState() {
        return this.currentSensors;
    }
    /**
     * Process voice audio from robot microphone -> STT -> Agent Brain -> TTS -> Robot Command
     */
    async handleAudioIn(audioPayload, context = {}) {
        const sessionId = context.sessionId || 'robot_' + Date.now();
        // 1. Transcribe audio to text
        const sttResult = await sttEngine.transcribe(audioPayload, { language: 'vi' });
        const userText = sttResult.text || 'Xin chào';
        // 2. Process with Agent Engine
        const agentCtx = {
            sessionId,
            channel: 'ROBOT',
            role: 'customer',
            isAuthenticated: Boolean(context.isAuthenticated),
            ...context,
        };
        const brainResponse = await processAgentMessage(userText, agentCtx);
        // 3. Derive Emotion & Servo Dynamics
        let emotion = 'speaking';
        let servo = { panAngle: 0, tiltAngle: 0 };
        const lower = brainResponse.content.toLowerCase();
        if (lower.includes('lỗi') || lower.includes('xin lỗi') || lower.includes('không tìm thấy')) {
            emotion = 'surprised';
            servo = { panAngle: -15, tiltAngle: -10 };
        }
        else if (lower.includes('tuyệt vời') || lower.includes('cảm ơn') || lower.includes('chào bạn')) {
            emotion = 'happy';
            servo = { panAngle: 10, tiltAngle: 15 };
        }
        // 4. Synthesize Vietnamese Edge-TTS speech
        const ttsResult = await ttsEngine.synthesize(brainResponse.content, {
            voice: 'vi-VN-HoaiMyNeural',
            rate: '+5%',
        });
        return {
            type: 'robot.response',
            sessionId,
            text: brainResponse.content,
            emotion,
            tts: {
                ssml: ttsResult.ssml,
                voice: ttsResult.voice,
                format: ttsResult.format,
                durationEstimateMs: ttsResult.durationEstimateMs,
            },
            servo,
            timestamp: new Date().toISOString(),
        };
    }
}
export const robotChannelAdapter = new RobotChannelAdapter();
