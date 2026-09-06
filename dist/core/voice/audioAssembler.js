// src/core/voice/audioAssembler.ts
// BOWCON V4.0 — AUDIO ASSEMBLY ENGINE (MILESTONE 1.3.6)
//
// Invariants (INV-11):
// - Assembles sentence-level audio chunks in chronological order.
// - Re-calculates and canonicalizes binary WAV/PCM headers.
// - Synthesizes accurate PCM silence frames for planned pauses.
// - Fails closed on truncated, empty, or corrupted audio payloads.
import { VoiceSynthesisError } from './voiceErrors.js';
export class AudioAssembler {
    /**
     * Generates a buffer of 16-bit mono PCM silence.
     */
    static createPcmSilence(durationMs, sampleRate = 16000) {
        if (durationMs <= 0)
            return Buffer.alloc(0);
        const numSamples = Math.floor((sampleRate * durationMs) / 1000);
        const numBytes = numSamples * 2; // 16-bit mono = 2 bytes per sample
        return Buffer.alloc(numBytes); // All zeros represents digital silence in signed 16-bit PCM
    }
    /**
     * Validates that a buffer starts with a valid standard RIFF WAV header.
     */
    static isValidWavBuffer(buf) {
        if (!buf || buf.length < 44) {
            return { valid: false, error: `Buffer is too small for WAV header (${buf ? buf.length : 0} bytes, minimum 44 bytes required)` };
        }
        if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
            return { valid: false, error: 'Invalid RIFF/WAVE header descriptor' };
        }
        // Parse 'fmt ' subchunk
        let offset = 12;
        let sampleRate = 16000;
        let dataOffset = 44;
        let dataSize = buf.length - 44;
        let foundFmt = false;
        let foundData = false;
        while (offset < buf.length - 8) {
            const subchunkId = buf.toString('ascii', offset, offset + 4);
            const subchunkSize = buf.readUInt32LE(offset + 4);
            if (subchunkId === 'fmt ') {
                foundFmt = true;
                sampleRate = buf.readUInt32LE(offset + 12);
            }
            else if (subchunkId === 'data') {
                foundData = true;
                dataOffset = offset + 8;
                dataSize = subchunkSize;
                break;
            }
            offset += 8 + subchunkSize;
        }
        if (!foundFmt || !foundData) {
            // Fallback: standard canonical 44-byte structure
            if (buf.toString('ascii', 12, 16) === 'fmt ' && buf.toString('ascii', 36, 40) === 'data') {
                sampleRate = buf.readUInt32LE(24);
                dataOffset = 44;
                dataSize = buf.readUInt32LE(40);
                return { valid: true, sampleRate, dataOffset, dataSize };
            }
            return { valid: false, error: 'Missing standard fmt or data subchunks in WAV header' };
        }
        return { valid: true, sampleRate, dataOffset, dataSize };
    }
    /**
     * Assembles multiple WAV chunks into a single continuous valid RIFF WAV buffer.
     */
    static assembleWav(chunks, defaultSampleRate = 16000) {
        if (!chunks || chunks.length === 0) {
            throw new VoiceSynthesisError('Cannot assemble empty chunks array');
        }
        const pcmBuffers = [];
        let detectedSampleRate = defaultSampleRate;
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const buf = Buffer.isBuffer(chunk.audioData) ? chunk.audioData : Buffer.from(chunk.audioData);
            const check = AudioAssembler.isValidWavBuffer(buf);
            if (!check.valid) {
                throw new VoiceSynthesisError(`AUDIO_CORRUPTED: Chunk ${i} is not a valid WAV: ${check.error}`);
            }
            if (i === 0 && check.sampleRate) {
                detectedSampleRate = check.sampleRate;
            }
            // Extract raw PCM payload
            const pcmPayload = buf.subarray(check.dataOffset || 44);
            pcmBuffers.push(pcmPayload);
            // Insert pause silence between segments if requested (except after the last chunk)
            if (chunk.pauseAfterMs && chunk.pauseAfterMs > 0 && i < chunks.length - 1) {
                const silence = AudioAssembler.createPcmSilence(chunk.pauseAfterMs, detectedSampleRate);
                pcmBuffers.push(silence);
            }
        }
        const combinedPcm = Buffer.concat(pcmBuffers);
        const numChannels = 1;
        const bitsPerSample = 16;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const byteRate = detectedSampleRate * blockAlign;
        const totalDataSize = combinedPcm.length;
        const totalFileSize = 44 + totalDataSize;
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0, 'ascii');
        wavHeader.writeUInt32LE(totalFileSize - 8, 4);
        wavHeader.write('WAVE', 8, 'ascii');
        wavHeader.write('fmt ', 12, 'ascii');
        wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
        wavHeader.writeUInt16LE(1, 20); // PCM format
        wavHeader.writeUInt16LE(numChannels, 22);
        wavHeader.writeUInt32LE(detectedSampleRate, 24);
        wavHeader.writeUInt32LE(byteRate, 28);
        wavHeader.writeUInt16LE(blockAlign, 32);
        wavHeader.writeUInt16LE(bitsPerSample, 34);
        wavHeader.write('data', 36, 'ascii');
        wavHeader.writeUInt32LE(totalDataSize, 40);
        return Buffer.concat([wavHeader, combinedPcm]);
    }
    /**
     * Assembles multiple raw PCM chunks into a single continuous PCM buffer.
     */
    static assemblePcm(chunks, sampleRate = 16000) {
        if (!chunks || chunks.length === 0) {
            throw new VoiceSynthesisError('Cannot assemble empty chunks array');
        }
        const buffers = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const buf = Buffer.isBuffer(chunk.audioData) ? chunk.audioData : Buffer.from(chunk.audioData);
            if (buf.length === 0) {
                throw new VoiceSynthesisError(`AUDIO_CORRUPTED: PCM Chunk ${i} is empty (0 bytes)`);
            }
            buffers.push(buf);
            if (chunk.pauseAfterMs && chunk.pauseAfterMs > 0 && i < chunks.length - 1) {
                buffers.push(AudioAssembler.createPcmSilence(chunk.pauseAfterMs, sampleRate));
            }
        }
        return Buffer.concat(buffers);
    }
    /**
     * Assembles multiple MP3 chunks into a single continuous MP3 stream.
     */
    static assembleMp3(chunks) {
        if (!chunks || chunks.length === 0) {
            throw new VoiceSynthesisError('Cannot assemble empty chunks array');
        }
        const buffers = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const buf = Buffer.isBuffer(chunk.audioData) ? chunk.audioData : Buffer.from(chunk.audioData);
            if (buf.length < 4) {
                throw new VoiceSynthesisError(`AUDIO_CORRUPTED: MP3 Chunk ${i} is truncated (${buf.length} bytes)`);
            }
            // Check MP3 frame sync word 0xFF
            if (buf[0] !== 0xff) {
                throw new VoiceSynthesisError(`AUDIO_CORRUPTED: MP3 Chunk ${i} does not start with valid frame sync`);
            }
            buffers.push(buf);
        }
        return Buffer.concat(buffers);
    }
    /**
     * Assembles chunks according to their common output format.
     */
    static assemble(chunks, format = 'audio/wav', sampleRate) {
        if (!chunks || chunks.length === 0) {
            throw new VoiceSynthesisError('No chunks provided for assembly');
        }
        // Verify format consistency
        for (const chunk of chunks) {
            if (chunk.format !== format) {
                throw new VoiceSynthesisError(`AUDIO_FORMAT_MISMATCH: Expected ${format} but received ${chunk.format}`);
            }
        }
        switch (format) {
            case 'audio/wav':
                return AudioAssembler.assembleWav(chunks, sampleRate);
            case 'audio/pcm':
                return AudioAssembler.assemblePcm(chunks, sampleRate);
            case 'audio/mpeg':
                return AudioAssembler.assembleMp3(chunks);
            default:
                throw new VoiceSynthesisError(`Unsupported audio assembly format: ${format}`);
        }
    }
}
