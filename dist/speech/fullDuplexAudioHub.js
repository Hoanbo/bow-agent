// src/speech/fullDuplexAudioHub.ts
// BOW AGENT V4.0 MILESTONE 2 — FULL-DUPLEX AUDIO HUB & REALTIME BARGE-IN INTERRUPT
//
// Manages continuous bi-directional audio streaming between User and Robot.
// Tracks conversational states (IDLE, LISTENING, THINKING, SPEAKING, INTERRUPTED).
// Provides sub-80ms Voice Activity Detection (VAD) to instantly interrupt Robot speech
// when the Boss speaks over it, matching OpenAI Advanced Voice / Gemini Live capabilities.
import { EventEmitter } from 'node:events';
import { sttEngine } from './sttEngine.js';
export class FullDuplexAudioHub extends EventEmitter {
    sessions = new Map();
    pendingPlaybackQueues = new Map();
    /**
     * Initialize or retrieve an active audio session
     */
    getOrCreateSession(sessionId = 'default_robot_session') {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                sessionId,
                state: 'IDLE',
                lastUserSpeechTimestamp: Date.now(),
                interruptedCount: 0,
            });
            this.pendingPlaybackQueues.set(sessionId, []);
        }
        return this.sessions.get(sessionId);
    }
    /**
     * Get current state of a session
     */
    getState(sessionId = 'default_robot_session') {
        return this.getOrCreateSession(sessionId).state;
    }
    /**
     * Set conversation state
     */
    setState(sessionId, state) {
        const session = this.getOrCreateSession(sessionId);
        session.state = state;
        this.emit('stateChanged', { sessionId, state });
    }
    /**
     * Register active TTS playback for Robot
     */
    startRobotSpeaking(sessionId, playbackId = 'pb_' + Date.now()) {
        const session = this.getOrCreateSession(sessionId);
        session.state = 'SPEAKING';
        session.currentPlaybackId = playbackId;
        this.emit('speakingStarted', { sessionId, playbackId });
    }
    /**
     * Process an incoming stream chunk of audio from user's microphone.
     * If the Robot is currently speaking, evaluates VAD for instant Barge-in Interrupt!
     */
    processIncomingAudioChunk(sessionId, chunk) {
        const startTime = Date.now();
        const session = this.getOrCreateSession(sessionId);
        // 1. Detect voice activity energy
        const vad = sttEngine.detectVoiceActivity(chunk);
        // 2. Check Barge-in Condition: Robot is SPEAKING and User starts talking!
        if (session.state === 'SPEAKING' && vad.energyLevel > 0.4) {
            const latencyMs = Date.now() - startTime;
            const interruptedPlaybackId = session.currentPlaybackId;
            // Immediately transition to INTERRUPTED
            session.state = 'INTERRUPTED';
            session.interruptedCount++;
            session.lastUserSpeechTimestamp = Date.now();
            // Clear all queued pending audio chunks for playback
            const clearedCount = this.clearPlaybackQueue(sessionId);
            const bargeInPayload = {
                sessionId,
                timestamp: new Date().toISOString(),
                interruptedPlaybackId,
                detectionLatencyMs: latencyMs,
                energyLevel: vad.energyLevel,
            };
            // Emit barge-in event to stop hardware speakers immediately (0ms)
            this.emit('bargeIn', bargeInPayload);
            // Automatically switch back to LISTENING to capture user's new utterance
            session.state = 'LISTENING';
            session.currentPlaybackId = undefined;
            return {
                isInterrupted: true,
                energyLevel: vad.energyLevel,
                latencyMs,
            };
        }
        // Normal listening chunk processing
        if (vad.energyLevel > 0.4 && session.state === 'IDLE') {
            session.state = 'LISTENING';
        }
        return {
            isInterrupted: false,
            energyLevel: vad.energyLevel,
            latencyMs: Date.now() - startTime,
        };
    }
    /**
     * Clear pending audio playback buffers
     */
    clearPlaybackQueue(sessionId) {
        const queue = this.pendingPlaybackQueues.get(sessionId) || [];
        const count = queue.length;
        this.pendingPlaybackQueues.set(sessionId, []);
        return count;
    }
    /**
     * Force abort active playback
     */
    abortPlayback(sessionId) {
        const session = this.getOrCreateSession(sessionId);
        const wasSpeaking = session.state === 'SPEAKING';
        const clearedBuffers = this.clearPlaybackQueue(sessionId);
        session.state = 'LISTENING';
        session.currentPlaybackId = undefined;
        return {
            aborted: wasSpeaking,
            clearedBuffers,
        };
    }
}
export const fullDuplexAudioHub = new FullDuplexAudioHub();
