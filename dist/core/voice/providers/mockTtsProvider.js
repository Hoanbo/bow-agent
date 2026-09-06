// src/core/voice/providers/mockTtsProvider.ts
// BOWCON V4.0 — DETERMINISTIC MOCK TTS PROVIDER (MILESTONE 1.3.5)
//
// Generates valid binary RIFF WAV audio buffers for offline test execution and verification.
import { VoiceProviderError } from '../voiceErrors.js';
export class MockTtsProvider {
    simulatedDelayMs = 0;
    simulatedFailure = null;
    mockSupportsSentenceLevel = true;
    mockSupportsSsml = true;
    getProviderId() {
        return 'mock';
    }
    getCapabilities() {
        return {
            providerId: 'mock',
            supportedLanguages: ['vi-VN', 'en-US', 'ja-JP', 'fr-FR', 'es-ES', 'de-DE'],
            supportedFormats: ['audio/wav', 'audio/mpeg', 'audio/pcm'],
            supportsStreaming: true,
            supportsPitch: true,
            supportsSpeed: true,
            supportsStyles: true,
            supportsSsml: this.mockSupportsSsml,
            supportsProsody: true,
            supportsEmphasis: true,
            supportsPronunciation: true,
            supportsSentenceLevelSynthesis: this.mockSupportsSentenceLevel,
            supportsVoiceStability: true,
            supportsStyleControl: true,
            maxTextLength: 50_000,
        };
    }
    setSimulatedDelay(ms) {
        this.simulatedDelayMs = ms;
    }
    setSimulatedFailure(errorMessage) {
        this.simulatedFailure = errorMessage;
    }
    setSupportsSentenceLevel(supported) {
        this.mockSupportsSentenceLevel = supported;
    }
    setSupportsSsml(supported) {
        this.mockSupportsSsml = supported;
    }
    validate(config) {
        const errors = [];
        if (config.outputFormat && !['audio/wav', 'audio/mpeg', 'audio/pcm'].includes(config.outputFormat)) {
            errors.push(`Unsupported format for mock provider: ${config.outputFormat}`);
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Builds a genuine, valid standard 44-byte RIFF WAV audio buffer containing
     * synthesized 16-bit PCM audio.
     */
    static createValidWavBuffer(durationMs, sampleRate = 16000) {
        const numChannels = 1;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const numSamples = Math.floor((sampleRate * durationMs) / 1000);
        const dataSize = numSamples * blockAlign;
        const totalFileSize = 44 + dataSize;
        const buffer = Buffer.alloc(totalFileSize);
        // 1. "RIFF" chunk descriptor
        buffer.write('RIFF', 0, 'ascii');
        buffer.writeUInt32LE(totalFileSize - 8, 4);
        buffer.write('WAVE', 8, 'ascii');
        // 2. "fmt " subchunk
        buffer.write('fmt ', 12, 'ascii');
        buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM = 16
        buffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
        buffer.writeUInt16LE(numChannels, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(byteRate, 28);
        buffer.writeUInt16LE(blockAlign, 32);
        buffer.writeUInt16LE(bitsPerSample, 34);
        // 3. "data" subchunk
        buffer.write('data', 36, 'ascii');
        buffer.writeUInt32LE(dataSize, 40);
        // 4. Fill PCM samples with a soft 440Hz sine wave tone
        const frequency = 440;
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const sample = Math.sin(2 * Math.PI * frequency * t) * 0.25; // 25% amplitude
            const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
            buffer.writeInt16LE(intSample, 44 + i * 2);
        }
        return buffer;
    }
    async synthesize(request) {
        if (this.simulatedDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, this.simulatedDelayMs));
        }
        if (this.simulatedFailure) {
            throw new VoiceProviderError(this.simulatedFailure);
        }
        const words = (request.text || '').trim().split(/\s+/).filter(Boolean).length;
        const durationMs = Math.max(150, Math.round((words / 3.0) * 1000));
        const format = request.voiceConfig?.outputFormat || 'audio/wav';
        const sampleRate = request.voiceConfig?.sampleRate || 16000;
        let audioData;
        if (format === 'audio/wav') {
            audioData = MockTtsProvider.createValidWavBuffer(durationMs, sampleRate);
        }
        else if (format === 'audio/pcm') {
            // Raw 16-bit PCM bytes (strip 44-byte WAV header)
            const wav = MockTtsProvider.createValidWavBuffer(durationMs, sampleRate);
            audioData = wav.subarray(44);
        }
        else {
            // audio/mpeg: mock MP3 frame with syncword
            audioData = Buffer.concat([
                Buffer.from([0xff, 0xfb, 0x90, 0x64]), // standard MP3 frame sync
                Buffer.alloc(Math.min(2048, durationMs * 2)),
            ]);
        }
        return {
            success: true,
            provider: 'mock',
            audioFormat: format,
            audioData,
            durationMs,
            speechText: request.text,
            metadata: {
                words,
                sampleRate,
                byteLength: audioData.length,
            },
        };
    }
    async *synthesizeStream(request) {
        const res = await this.synthesize(request);
        if (!res.audioData)
            return;
        const fullBuffer = Buffer.isBuffer(res.audioData) ? res.audioData : Buffer.from(res.audioData);
        const chunkSize = 1024;
        for (let offset = 0; offset < fullBuffer.length; offset += chunkSize) {
            yield fullBuffer.subarray(offset, Math.min(offset + chunkSize, fullBuffer.length));
        }
    }
}
