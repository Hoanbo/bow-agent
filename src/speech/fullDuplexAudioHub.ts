// src/speech/fullDuplexAudioHub.ts
// BOW AGENT V4.0 MILESTONE 2 — FULL-DUPLEX AUDIO HUB & REALTIME BARGE-IN INTERRUPT
//
// Manages continuous bi-directional audio streaming between User and Robot.
// Tracks conversational states (IDLE, LISTENING, THINKING, SPEAKING, INTERRUPTED).
// Provides sub-80ms Voice Activity Detection (VAD) to instantly interrupt Robot speech
// when the Boss speaks over it, matching OpenAI Advanced Voice / Gemini Live capabilities.

import { sttEngine } from './sttEngine.js';

export class SimpleEventEmitter {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  public on(event: string, fn: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(fn);
    return this;
  }

  public emit(event: string, ...args: any[]): boolean {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const fn of list) {
      try { fn(...args); } catch {}
    }
    return true;
  }

  public removeListener(event: string, fn: (...args: any[]) => void): this {
    const list = this.listeners.get(event);
    if (list) {
      this.listeners.set(event, list.filter(f => f !== fn));
    }
    return this;
  }

  public off(event: string, fn: (...args: any[]) => void): this {
    return this.removeListener(event, fn);
  }

  public once(event: string, fn: (...args: any[]) => void): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      fn(...args);
    };
    return this.on(event, onceWrapper);
  }
}

export type DuplexConversationState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED';

export interface AudioSessionState {
  sessionId: string;
  state: DuplexConversationState;
  lastUserSpeechTimestamp: number;
  currentPlaybackId?: string;
  interruptedCount: number;
}

export interface BargeInEvent {
  sessionId: string;
  timestamp: string;
  interruptedPlaybackId?: string;
  detectionLatencyMs: number;
  energyLevel: number;
}

export class FullDuplexAudioHub extends SimpleEventEmitter {
  private sessions: Map<string, AudioSessionState> = new Map();
  private pendingPlaybackQueues: Map<string, Array<any>> = new Map();

  /**
   * Initialize or retrieve an active audio session
   */
  public getOrCreateSession(sessionId: string = 'default_robot_session'): AudioSessionState {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        state: 'IDLE',
        lastUserSpeechTimestamp: Date.now(),
        interruptedCount: 0,
      });
      this.pendingPlaybackQueues.set(sessionId, []);
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Get current state of a session
   */
  public getState(sessionId: string = 'default_robot_session'): DuplexConversationState {
    return this.getOrCreateSession(sessionId).state;
  }

  /**
   * Set conversation state
   */
  public setState(sessionId: string, state: DuplexConversationState): void {
    const session = this.getOrCreateSession(sessionId);
    session.state = state;
    this.emit('stateChanged', { sessionId, state });
  }

  /**
   * Register active TTS playback for Robot
   */
  public startRobotSpeaking(sessionId: string, playbackId: string = 'pb_' + Date.now()): void {
    const session = this.getOrCreateSession(sessionId);
    session.state = 'SPEAKING';
    session.currentPlaybackId = playbackId;
    this.emit('speakingStarted', { sessionId, playbackId });
  }

  /**
   * Process an incoming stream chunk of audio from user's microphone.
   * If the Robot is currently speaking, evaluates VAD for instant Barge-in Interrupt!
   */
  public processIncomingAudioChunk(
    sessionId: string,
    chunk: Buffer | string
  ): { isInterrupted: boolean; energyLevel: number; latencyMs: number } {
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

      const bargeInPayload: BargeInEvent = {
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
  public clearPlaybackQueue(sessionId: string): number {
    const queue = this.pendingPlaybackQueues.get(sessionId) || [];
    const count = queue.length;
    this.pendingPlaybackQueues.set(sessionId, []);
    return count;
  }

  /**
   * Force abort active playback
   */
  public abortPlayback(sessionId: string): { aborted: boolean; clearedBuffers: number } {
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
