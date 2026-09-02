import type { RobotSensorSnapshot, RobotSpeechOptions, RobotDirection } from '../contracts/robotAdapter.js';
import type { ShopEventPayload } from '../contracts/adminProvider.js';
import { processAgentMessage } from '../core/engine.js';
import { ttsEngine } from '../speech/ttsEngine.js';
import { sttEngine } from '../speech/sttEngine.js';
import { fullDuplexAudioHub } from '../speech/fullDuplexAudioHub.js';
import type { AgentContext } from '../core/types.js';

export type RobotEmotion = 'neutral' | 'happy' | 'thinking' | 'surprised' | 'sleeping' | 'listening' | 'speaking' | 'error';

export interface RobotServoCommand {
  panAngle?: number;  // -90 to +90 degrees
  tiltAngle?: number; // -45 to +45 degrees
  speed?: number;     // 1 to 100%
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

export class RobotChannelAdapter {
  private online = true;
  private eventListeners: Set<RobotEventListener> = new Set();
  private currentSensors: RobotSensorSnapshot = {
    batteryPercent: 95,
    isCharging: false,
    temperatureCelsius: 36.5,
    obstaclesDetected: false,
    activeSensors: ['ultrasonic', 'imu', 'microphone', 'oled_eye'],
    timestamp: new Date().toISOString(),
  };

  constructor() {
    fullDuplexAudioHub.on('bargeIn', (bargeIn) => {
      const interruptCommand: RobotCommandPayload = {
        type: 'robot.interrupt',
        sessionId: bargeIn.sessionId,
        action: 'stop_playback',
        reason: 'barge_in',
        text: 'Dạ, em nghe Sếp!',
        emotion: 'listening',
        servo: { panAngle: 0, tiltAngle: 10 },
        interrupt: {
          action: 'stop_playback',
          reason: 'barge_in',
          detectionLatencyMs: bargeIn.detectionLatencyMs,
        },
        timestamp: new Date().toISOString(),
      };


      for (const listener of this.eventListeners) {
        try {
          listener(interruptCommand);
        } catch (err) {
          console.error('[ROBOT-ADAPTER] Error dispatching interrupt to listener:', err);
        }
      }
    });
  }

  public isOnline(): boolean {

    return this.online;
  }

  public registerListener(listener: RobotEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public updateSensorState(snapshot: Partial<RobotSensorSnapshot>): void {
    this.currentSensors = {
      ...this.currentSensors,
      ...snapshot,
      timestamp: new Date().toISOString(),
    };
  }

  public async getSensorState(): Promise<RobotSensorSnapshot> {
    return this.currentSensors;
  }

  /**
   * Process voice audio from robot microphone -> STT -> Agent Brain -> TTS -> Robot Command
   * (BOW-Robot phục vụ riêng Chủ nhân/Boss với quyền role: 'owner')
   */
  public async handleAudioIn(
    audioPayload: string | Buffer,
    context: Partial<AgentContext> = {}
  ): Promise<RobotCommandPayload> {
    const sessionId = context.sessionId || 'robot_' + Date.now();

    // 1. Transcribe audio to text
    const sttResult = await sttEngine.transcribe(audioPayload, { language: 'vi' });
    const userText = sttResult.text || 'Xin chào';

    // 2. Process with Agent Engine (Mặc định phục vụ Boss: role = 'owner')
    const agentCtx: AgentContext = {
      sessionId,
      channel: 'ROBOT' as any,
      role: (context.role as any) || 'owner',
      isAuthenticated: true,
      ...context,
    };

    const brainResponse = await processAgentMessage(userText, agentCtx);

    // 3. Derive Emotion & Servo Dynamics
    let emotion: RobotEmotion = 'speaking';
    let servo: RobotServoCommand | undefined = { panAngle: 0, tiltAngle: 0 };

    const lower = brainResponse.content.toLowerCase();
    if (lower.includes('lỗi') || lower.includes('xin lỗi') || lower.includes('không tìm thấy')) {
      emotion = 'surprised';
      servo = { panAngle: -15, tiltAngle: -10 };
    } else if (lower.includes('tuyệt vời') || lower.includes('cảm ơn') || lower.includes('chào bạn') || lower.includes('sếp') || lower.includes('doanh thu')) {
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

  /**
   * PROACTIVE NOTIFICATION: Shop phát sinh event (tiền về, đơn mới, tồn kho thấp)
   * Robot chủ động đổi mắt OLED, xoay servo và cất tiếng báo cho Boss.
   */
  public async pushShopEventToOwner(event: ShopEventPayload): Promise<RobotCommandPayload> {
    let alertText = '';
    let emotion: RobotEmotion = 'speaking';
    let servo: RobotServoCommand = { panAngle: 0, tiltAngle: 10 };

    switch (event.type) {
      case 'order.paid': {
        const formattedAmount = event.amount ? `${event.amount.toLocaleString('vi-VN')} đồng` : '';
        alertText = `Sếp ơi! Vừa có đơn hàng mới thành công: ${event.productName || 'gói cước'} ${formattedAmount ? `trị giá ${formattedAmount}` : ''}!`;
        emotion = 'happy';
        servo = { panAngle: 20, tiltAngle: 15 };
        break;
      }
      case 'wallet.deposit': {
        const formattedAmount = event.amount ? `${event.amount.toLocaleString('vi-VN')} đồng` : '';
        alertText = `Sếp ơi, tài khoản ví vừa được nạp thêm ${formattedAmount} từ khách hàng ${event.customerName || ''}!`;
        emotion = 'happy';
        servo = { panAngle: 15, tiltAngle: 10 };
        break;
      }
      case 'stock.low': {
        alertText = `Cảnh báo sếp ơi, sản phẩm ${event.productName || 'này'} chỉ còn ít slot trong kho, sếp nhớ bổ sung nhé!`;
        emotion = 'surprised';
        servo = { panAngle: -10, tiltAngle: -5 };
        break;
      }
      case 'ticket.urgent': {
        alertText = `Sếp ơi, có một yêu cầu bảo hành khẩn cấp cần xem qua: ${event.title}!`;
        emotion = 'surprised';
        servo = { panAngle: -15, tiltAngle: 0 };
        break;
      }
      default: {
        alertText = `Sếp ơi, Shop of BOW có thông báo mới: ${event.title}. ${event.description}`;
        emotion = 'speaking';
        servo = { panAngle: 0, tiltAngle: 5 };
      }
    }

    // Synthesize TTS
    const ttsResult = await ttsEngine.synthesize(alertText, {
      voice: 'vi-VN-HoaiMyNeural',
      rate: '+5%',
    });

    const command: RobotCommandPayload = {
      type: 'robot.proactive_event',
      sessionId: `event_${event.eventId || Date.now()}`,
      text: alertText,
      emotion,
      tts: {
        ssml: ttsResult.ssml,
        voice: ttsResult.voice,
        format: ttsResult.format,
        durationEstimateMs: ttsResult.durationEstimateMs,
      },
      servo,
      event,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all active listeners (e.g. WebSocket connection from physical Robot)
    for (const listener of this.eventListeners) {
      try {
        listener(command);
      } catch (err) {
        console.error('[ROBOT-ADAPTER] Error dispatching proactive event to listener:', err);
      }
    }

    return command;
  }

  /**
   * Process real-time streaming audio chunk from microphone with instant sub-80ms Barge-in
   */
  public handleStreamingAudioChunk(
    chunk: Buffer | string,
    sessionId: string = 'robot_default_session'
  ): { isInterrupted: boolean; energyLevel: number; latencyMs: number } {
    return fullDuplexAudioHub.processIncomingAudioChunk(sessionId, chunk);
  }
}



export const robotChannelAdapter = new RobotChannelAdapter();
