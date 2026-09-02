export declare class SimpleEventEmitter {
    private listeners;
    on(event: string, fn: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    removeListener(event: string, fn: (...args: any[]) => void): this;
    off(event: string, fn: (...args: any[]) => void): this;
    once(event: string, fn: (...args: any[]) => void): this;
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
export declare class FullDuplexAudioHub extends SimpleEventEmitter {
    private sessions;
    private pendingPlaybackQueues;
    /**
     * Initialize or retrieve an active audio session
     */
    getOrCreateSession(sessionId?: string): AudioSessionState;
    /**
     * Get current state of a session
     */
    getState(sessionId?: string): DuplexConversationState;
    /**
     * Set conversation state
     */
    setState(sessionId: string, state: DuplexConversationState): void;
    /**
     * Register active TTS playback for Robot
     */
    startRobotSpeaking(sessionId: string, playbackId?: string): void;
    /**
     * Process an incoming stream chunk of audio from user's microphone.
     * If the Robot is currently speaking, evaluates VAD for instant Barge-in Interrupt!
     */
    processIncomingAudioChunk(sessionId: string, chunk: Buffer | string): {
        isInterrupted: boolean;
        energyLevel: number;
        latencyMs: number;
    };
    /**
     * Clear pending audio playback buffers
     */
    clearPlaybackQueue(sessionId: string): number;
    /**
     * Force abort active playback
     */
    abortPlayback(sessionId: string): {
        aborted: boolean;
        clearedBuffers: number;
    };
}
export declare const fullDuplexAudioHub: FullDuplexAudioHub;
