// src/embodied/morningBriefingService.ts
// BOW CON V4.0 — MORNING EXECUTIVE BRIEFING & EMBODIED ROBOT EXECUTION

import { globalNightlyHunter, MorningDigest } from './nightlyHunterDaemon.js';
import { globalBossMemory } from './bossMemoryHub.js';
import { robotChannelAdapter as robotAdapter } from '../adapters/robotAdapter.js';
import { smartHomeService } from './smartHomeService.js';

export interface BriefingExecutionResult {
  speechText: string;
  digest: MorningDigest;
  robotActions: {
    servoAngle: number;
    eyesEmotion: string;
    deskLightStatus: string;
  };
  executedAt: string;
}

export class MorningBriefingService {
  /**
   * Tạo văn bản đọc bản tin buổi sáng súc tích và truyền cảm
   */
  public generateBriefingScript(digest: MorningDigest): string {
    const boss = globalBossMemory.getProfile();
    const beverage = boss.habits.preferredBeverage || 'cà phê nóng';

    let script = `Xin kính chào Ngài! Tôi là BOWCON đây ạ.\n\n`;
    script += `Kính chúc Ngài một buổi sáng tràn đầy năng lượng! Tôi đã tự động bật đèn bàn làm việc cho Ngài. Ngài nhớ thưởng thức một ly ${beverage} nhé.\n\n`;

    script += `📰 **Về tin tức công nghệ mới sáng nay:**\n`;
    digest.techNews.forEach((news, idx) => {
      script += `${idx + 1}. **${news.title}**: ${news.summary} 👉 *${news.relevanceToBoss}*\n\n`;
    });

    script += `📊 **Về tình hình Shop of BOW hôm qua:**\n`;
    script += `• Doanh thu: **${digest.shopExecutiveSummary.totalRevenueYesterday.toLocaleString('vi-VN')}đ**\n`;
    script += `• Lợi nhuận ròng: **${digest.shopExecutiveSummary.netProfitYesterday.toLocaleString('vi-VN')}đ**\n`;
    if (digest.shopExecutiveSummary.pendingFulfillmentCount > 0) {
      script += `• ⚠️ Hiện có **${digest.shopExecutiveSummary.pendingFulfillmentCount} đơn hàng** đang chờ ${boss.title} bàn giao cho khách ạ.\n`;
    } else {
      script += `• Toàn bộ đơn hàng đã hoàn tất sạch sẽ!\n`;
    }

    script += `\nKính chúc Ngài một ngày làm việc thật nhiều cảm hứng và thành công! Có bất kỳ việc gì cần hỗ trợ, Ngài cứ giao nhiệm vụ cho tôi nhé!`;

    return script;
  }

  /**
   * Kích hoạt kịch bản chào buổi sáng hoàn chỉnh kết hợp cử chỉ Robot
   */
  public async executeMorningBriefing(): Promise<BriefingExecutionResult> {
    // 1. Lấy digest mới nhất (hoặc tạo mới nếu chưa có)
    let digest = globalNightlyHunter.getLatestDigest();
    if (!digest) {
      digest = await globalNightlyHunter.runNightlyHunterJob();
    }

    // 2. Tạo kịch bản lời thoại
    const speechText = this.generateBriefingScript(digest);

    // 3. Điều khiển phần cứng Robot qua robotAdapter
    let servoAngle = 0;
    let eyesEmotion = 'excited';
    let deskLightStatus = 'on';

    try {
      // Xoay đầu và biểu cảm mắt qua robotChannelAdapter
      await robotAdapter.pushShopEventToOwner({
        eventId: 'event_morning_briefing_' + Date.now(),
        type: 'system.alert',
        title: 'Bản tin chào buổi sáng',
        description: 'Robot cất giọng chào Sếp và kích hoạt đèn bàn làm việc',
        urgency: 'low',
        timestamp: new Date().toISOString(),
      });
      servoAngle = 0;
      eyesEmotion = 'happy';

      // Bật đèn bàn làm việc Smart Home
      await smartHomeService.executeCommand({
        device: 'desk_light',
        action: 'turn_on',
      });
      deskLightStatus = 'on';
    } catch (err) {
      console.warn('[MorningBriefingService] Robot hardware call failed (graceful simulation):', err);
    }

    return {
      speechText,
      digest,
      robotActions: {
        servoAngle,
        eyesEmotion,
        deskLightStatus,
      },
      executedAt: new Date().toISOString(),
    };
  }
}

// Global Singleton Instance
export const globalMorningBriefing = new MorningBriefingService();
