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
export declare class NightlyHunterDaemon {
    private isRunning;
    private timer;
    private filePath;
    constructor(customFilePath?: string);
    /**
     * Khởi động tiến trình chạy ngầm
     */
    startDaemon(): void;
    stopDaemon(): void;
    /**
     * Chạy nhiệm vụ cào tin tức và tổng hợp Shop (Có thể gọi thủ công bất cứ lúc nào)
     */
    runNightlyHunterJob(): Promise<MorningDigest>;
    saveDigest(digest: MorningDigest): void;
    getLatestDigest(): MorningDigest | null;
}
export declare const globalNightlyHunter: NightlyHunterDaemon;
