import type { RobotSensorSnapshot } from '../contracts/robotAdapter.js';
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
    type: 'robot.response';
    sessionId: string;
    text: string;
    emotion: RobotEmotion;
    tts?: {
        ssml: string;
        voice: string;
        format: string;
        durationEstimateMs: number;
    };
    servo?: RobotServoCommand;
    timestamp: string;
}
export declare class RobotChannelAdapter {
    private online;
    private currentSensors;
    isOnline(): boolean;
    updateSensorState(snapshot: Partial<RobotSensorSnapshot>): void;
    getSensorState(): Promise<RobotSensorSnapshot>;
    /**
     * Process voice audio from robot microphone -> STT -> Agent Brain -> TTS -> Robot Command
     */
    handleAudioIn(audioPayload: string | Buffer, context?: Partial<AgentContext>): Promise<RobotCommandPayload>;
}
export declare const robotChannelAdapter: RobotChannelAdapter;
