import { DurableJsonStore } from '../core/persistence/durableJsonStore.js';
export interface BossProject {
    id: string;
    name: string;
    description: string;
    techStack: string[];
    status: 'active' | 'planning' | 'completed';
    updatedAt: string;
}
export interface BossHabits {
    morningRoutine?: string;
    preferredBeverage?: string;
    workStartHour?: number;
    breakIntervalMinutes: number;
    favoriteMusicGenre?: string;
}
export interface BossProfile {
    name: string;
    title: string;
    habits: BossHabits;
    projects: BossProject[];
    healthNotes: string[];
    relationships: Array<{
        name: string;
        role: string;
        notes?: string;
    }>;
    customPreferences: Record<string, string>;
    lastInteractionTimestamp: number;
    lastBreakReminderTimestamp: number;
}
export declare class BossMemoryHub {
    readonly baseDir: string;
    readonly legacyFilePath: string;
    private singleFileOverride?;
    private stores;
    constructor(customBaseDirOrFilePath?: string, customLegacyFilePathOrAllowedDir?: string);
    /**
     * Resolve or initialize the isolated DurableJsonStore for the specified user.
     */
    getStore(userId?: string): DurableJsonStore<BossProfile>;
    getDefaultProfile(userId?: string): BossProfile;
    getProfile(userId?: string): BossProfile;
    saveMemory(userIdOrProfile: string | BossProfile, maybeProfile?: BossProfile): void;
    /**
     * Ghi nhớ một sở thích hoặc thói quen mới của Sếp
     */
    rememberHabit(userIdOrKey: string, keyOrValue: any, maybeValue?: any): void;
    /**
     * Ghi nhớ hoặc cập nhật một dự án nghiên cứu của Sếp
     */
    addOrUpdateProject(userIdOrProject: string | Omit<BossProject, 'updatedAt'>, maybeProject?: Omit<BossProject, 'updatedAt'>): BossProject;
    /**
     * Thêm lưu ý sức khỏe
     */
    addHealthNote(userIdOrNote: string, maybeNote?: string): void;
    /**
     * Kiểm tra xem đã đến lúc nhắc Sếp đứng dậy nghỉ ngơi chưa (mặc định 45 phút)
     */
    checkHealthBreakNeeded(userId?: string): {
        needed: boolean;
        minutesSitting: number;
        message?: string;
    };
    /**
     * Truy xuất ngữ cảnh tóm tắt về Sếp để nạp vào Prompt
     */
    getPromptContext(userId?: string): string;
    /**
     * Tự động trích xuất thông tin mới từ câu nói của Sếp (Extraction Heuristics)
     */
    extractFactFromText(text: string, userId?: string): {
        extracted: boolean;
        category?: string;
        summary?: string;
    };
}
export declare const globalBossMemory: BossMemoryHub;
