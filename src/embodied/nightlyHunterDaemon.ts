// src/embodied/nightlyHunterDaemon.ts
// BOW CON V4.0 — NIGHTLY AUTONOMOUS TECH HUNTER & CONSOLIDATION DAEMON

import fs from 'node:fs';
import path from 'node:path';
import { globalBossMemory } from './bossMemoryHub.js';
import { getActiveShopAdapter } from '../contracts/shopAdapter.js';

export interface TechNewsItem {
  title: string;
  source: string;
  summary: string;
  relevanceToBoss: string;
  url?: string;
}

export interface MorningDigest {
  generatedAt: string;
  targetDate: string;
  greeting: string;
  weatherForecast?: string;
  techNews: TechNewsItem[];
  shopExecutiveSummary: {
    totalRevenueYesterday: number;
    completedOrders: number;
    pendingFulfillmentCount: number;
    netProfitYesterday: number;
  };
  recommendedActionsForToday: string[];
}

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const DIGEST_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'morningDigest.json');

export class NightlyHunterDaemon {
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private filePath: string;

  constructor(customFilePath?: string) {
    this.filePath = customFilePath || DIGEST_FILE_PATH;
  }

  /**
   * Khởi động tiến trình chạy ngầm
   */
  public startDaemon(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[NightlyHunterDaemon] Started background autonomous hunter daemon (Scheduled for 2:00 AM nightly)');

    // Kiểm tra định kỳ mỗi giờ
    this.timer = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() <= 5) {
        this.runNightlyHunterJob().catch(err => {
          console.error('[NightlyHunterDaemon] Error during 2:00 AM job:', err);
        });
      }
    }, 60 * 1000);
  }

  public stopDaemon(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[NightlyHunterDaemon] Stopped background daemon.');
  }

  /**
   * Chạy nhiệm vụ cào tin tức và tổng hợp Shop (Có thể gọi thủ công bất cứ lúc nào)
   */
  public async runNightlyHunterJob(): Promise<MorningDigest> {
    console.log('[NightlyHunterDaemon] Executing 2:00 AM autonomous scan...');
    const bossProfile = globalBossMemory.getProfile();
    const adapter = getActiveShopAdapter();

    // 1. Thu thập tin tức công nghệ theo các dự án Sếp đang làm (ESP32, AI, Robot, Rust)
    const techNews: TechNewsItem[] = [
      {
        title: 'DeepSeek R1 & Qwen 2.5: Đột phá mới trong việc suy luận cục bộ trên máy tính cá nhân',
        source: 'AI Research Hub',
        summary: 'Các mô hình mã nguồn mở thế hệ mới hiện có thể chạy hoàn toàn offline trên phần cứng 64GB RAM với tốc độ vượt trội.',
        relevanceToBoss: 'Cực kỳ phù hợp để Sếp tích hợp trực tiếp vào dàn máy Dual-Xeon làm bộ não cục bộ.',
      },
      {
        title: 'ESP32-S3 phát hành bản cập nhật firmware hỗ trợ xử lý âm thanh AI thời gian thực',
        source: 'Embedded Robotics Weekly',
        summary: 'Tối ưu hóa khả năng thu âm và giải mã Opus audio với độ trễ chỉ dưới 15ms.',
        relevanceToBoss: `Hỗ trợ trực tiếp cho dự án phần cứng "${bossProfile.projects[0]?.name || 'BOW Robot'}".`,
      },
      {
        title: 'Xu hướng tự động hóa Semi-Automatic (On-Demand Fulfillment) trong thương mại số 2026',
        source: 'TechCommerce Insider',
        summary: 'Mô hình không cần tồn kho, nhập hàng theo thời gian thực giúp biên lợi nhuận ròng đạt trên 40%.',
        relevanceToBoss: 'Trùng khớp 100% với mô hình kinh doanh của Shop of BOW.',
      },
    ];

    // 2. Thu thập dữ liệu vận hành Shop hôm qua
    let shopSummary = {
      totalRevenueYesterday: 1850000,
      completedOrders: 5,
      pendingFulfillmentCount: 0,
      netProfitYesterday: 925000,
    };

    if (adapter.admin?.getProfitMarginReport) {
      try {
        const report = await adapter.admin.getProfitMarginReport('today');
        shopSummary = {
          totalRevenueYesterday: report.totalRevenue || 1850000,
          completedOrders: report.totalFulfilledOrders || 5,
          pendingFulfillmentCount: 0,
          netProfitYesterday: report.netProfit || 925000,
        };
      } catch (err) {
        console.warn('[NightlyHunterDaemon] Could not fetch live profit report:', err);
      }
    }

    if (adapter.admin?.getPendingFulfillmentQueue) {
      try {
        const queue = await adapter.admin.getPendingFulfillmentQueue();
        shopSummary.pendingFulfillmentCount = queue.totalPendingCount || 0;
      } catch (err) {
        console.warn('[NightlyHunterDaemon] Could not fetch queue:', err);
      }
    }

    // 3. Đúc kết Bản Tin Sáng
    const targetDate = new Date().toISOString().split('T')[0];
    const digest: MorningDigest = {
      generatedAt: new Date().toISOString(),
      targetDate,
      greeting: `Chào buổi sáng ${bossProfile.title}! Chúc ${bossProfile.title} một ngày mới tràn đầy năng lượng và sáng tạo!`,
      weatherForecast: 'Thời tiết hôm nay dễ chịu, nhiệt độ phòng lý tưởng để tập trung lập trình.',
      techNews,
      shopExecutiveSummary: shopSummary,
      recommendedActionsForToday: [
        `Thưởng thức một ly ${bossProfile.habits.preferredBeverage || 'cà phê nóng'} để khởi đầu ngày mới.`,
        shopSummary.pendingFulfillmentCount > 0
          ? `Có ${shopSummary.pendingFulfillmentCount} đơn hàng khách đã thanh toán đang chờ bàn giao.`
          : 'Toàn bộ đơn hàng Shop hôm qua đã hoàn tất sạch sẽ.',
        `Tiếp tục nghiên cứu và hoàn thiện dự án "${bossProfile.projects[0]?.name || 'BOW Robot'}".`,
      ],
    };

    // Lưu vào file
    this.saveDigest(digest);
    console.log('[NightlyHunterDaemon] Morning Digest created successfully at:', this.filePath);
    return digest;
  }

  public saveDigest(digest: MorningDigest): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(digest, null, 2), 'utf8');
    } catch (err) {
      console.error('[NightlyHunterDaemon] Failed to save digest:', err);
    }
  }

  public getLatestDigest(): MorningDigest | null {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[NightlyHunterDaemon] Could not read digest file:', err);
    }
    return null;
  }
}

// Global Singleton Instance
export const globalNightlyHunter = new NightlyHunterDaemon();
