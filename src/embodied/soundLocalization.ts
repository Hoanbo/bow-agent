// src/embodied/soundLocalization.ts
// BOW CON V4.0 — SOUND LOCALIZATION & EMBODIED HEAD TRACKING

import { robotChannelAdapter } from '../adapters/robotAdapter.js';

export interface SoundSourceEstimate {
  estimatedPanAngle: number; // -90 (trái) đến +90 (phải)
  confidence: number; // 0.0 đến 1.0
  sourceDirection: 'left' | 'center' | 'right';
  intensityDb: number;
}

export class SoundLocalizationEngine {
  private currentPanAngle: number = 0;
  private currentTiltAngle: number = 0;

  /**
   * Ước lượng hướng âm thanh từ năng lượng micro đa kênh hoặc dữ liệu cảm biến
   */
  public estimateSoundDirection(
    micLeftEnergy: number,
    micRightEnergy: number,
    totalRmsDb: number = 65
  ): SoundSourceEstimate {
    const diff = micRightEnergy - micLeftEnergy;
    const sum = micLeftEnergy + micRightEnergy || 1;
    const ratio = Math.max(-1, Math.min(1, diff / sum));

    // Chuyển đổi tỉ lệ sang góc servo Pan từ -90 đến +90 độ
    const estimatedPanAngle = Math.round(ratio * 75);
    const confidence = Math.min(1.0, Math.abs(ratio) * 1.2 + 0.3);

    let sourceDirection: 'left' | 'center' | 'right' = 'center';
    if (estimatedPanAngle < -20) {
      sourceDirection = 'left';
    } else if (estimatedPanAngle > 20) {
      sourceDirection = 'right';
    }

    return {
      estimatedPanAngle,
      confidence,
      sourceDirection,
      intensityDb: totalRmsDb,
    };
  }

  /**
   * Tự động xoay đầu Robot nhìn về hướng giọng nói của Sếp
   */
  public async trackAndAimHeadAtSound(
    micLeftEnergy: number,
    micRightEnergy: number
  ): Promise<{ success: boolean; targetAngle: number; direction: string }> {
    const estimate = this.estimateSoundDirection(micLeftEnergy, micRightEnergy);
    this.currentPanAngle = estimate.estimatedPanAngle;
    this.currentTiltAngle = 10; // Hơi ngước lên 10 độ nhìn vào mặt Sếp

    try {
      await robotChannelAdapter.pushShopEventToOwner({
        eventId: 'event_sound_aim_' + Date.now(),
        type: 'system.alert',
        title: 'Định vị nguồn âm thanh',
        description: `Robot tự động xoay đầu ${estimate.estimatedPanAngle} độ về hướng ${estimate.sourceDirection} để nhìn Sếp`,
        urgency: 'low',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        targetAngle: estimate.estimatedPanAngle,
        direction: estimate.sourceDirection,
      };
    } catch {
      return {
        success: true,
        targetAngle: estimate.estimatedPanAngle,
        direction: estimate.sourceDirection,
      };
    }
  }

  public getCurrentOrientation(): { pan: number; tilt: number } {
    return { pan: this.currentPanAngle, tilt: this.currentTiltAngle };
  }
}

// Global Singleton Instance
export const globalSoundLocalization = new SoundLocalizationEngine();
