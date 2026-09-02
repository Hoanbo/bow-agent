import type { RobotSensorSnapshot } from '../contracts/robotAdapter.js';
import type { ShopEventPayload } from '../contracts/adminProvider.js';
import type { AgentContext } from '../core/types.js';
export type RobotEmotion = 'neutral' | 'happy' | 'thinking' | 'surprised' | 'sleeping' | 'listening' | 'speaking' | 'error';
export interface RobotServoCommand {
    panAngle?: number;
    tiltAngle?: number;
    speed?: number;
}
export interface RobotAudioFrameMessage {
    type: 'robot.audio_in' | 'robot.audio_stream';
    sessionId: string;
    audioBase64: string;
    format?: 'pcm' | 'wav' | 'mp3';
}
export interface RobotCommandPayload {
    type: 'robot.response' | 'robot.proactive_event' | 'robot.interrupt';
    sessionId: string;
    text: string;
    emotion: RobotEmotion;
    action?: 'stop_playback' | string;
    reason?: 'barge_in' | string;
    tts?: {
        ssml: string;
        voice: string;
        format: string;
        durationEstimateMs: number;
    };
    servo?: RobotServoCommand;
    event?: ShopEventPayload;
    interrupt?: {
        action: 'stop_playback';
        reason: 'barge_in';
        detectionLatencyMs: number;
    };
    timestamp: string;
}
export type RobotEventListener = (command: RobotCommandPayload) => void;
export declare class RobotChannelAdapter {
    private online;
    private eventListeners;
    private currentSensors;
    constructor();
    isOnline(): boolean;
    registerListener(listener: RobotEventListener): () => void;
    updateSensorState(snapshot: Partial<RobotSensorSnapshot>): void;
    getSensorState(): Promise<RobotSensorSnapshot>;
    /**
     * Process voice audio from robot microphone -> STT -> Agent Brain -> TTS -> Robot Command
     * (BOW-Robot phục vụ riêng Chủ nhân/Boss với quyền role: 'owner')
     */
    handleAudioIn(audioPayload: string | Buffer, context?: Partial<AgentContext>): Promise<RobotCommandPayload>;
    /**
     * PROACTIVE NOTIFICATION: Shop phát sinh event (tiền về, đơn mới, tồn kho thấp)
     * Robot chủ động đổi mắt OLED, xoay servo và cất tiếng báo cho Boss.
     */
    pushShopEventToOwner(event: ShopEventPayload): Promise<RobotCommandPayload>;
    /**
     * Process real-time streaming audio chunk from microphone with instant sub-80ms Barge-in
     */
    handleStreamingAudioChunk(chunk: Buffer | string, sessionId?: string): {
        isInterrupted: boolean;
        energyLevel: number;
        latencyMs: number;
    };
}
export declare const robotChannelAdapter: RobotChannelAdapter;
