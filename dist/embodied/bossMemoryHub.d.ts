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
    private profile;
    private filePath;
    constructor(customFilePath?: string);
    private getDefaultProfile;
    private loadMemory;
    saveMemory(profileToSave?: BossProfile): void;
    getProfile(): BossProfile;
    /**
     * Ghi nhớ một sở thích hoặc thói quen mới của Sếp
     */
    rememberHabit(key: keyof BossHabits, value: any): void;
    /**
     * Ghi nhớ hoặc cập nhật một dự án nghiên cứu của Sếp
     */
    addOrUpdateProject(project: Omit<BossProject, 'updatedAt'>): BossProject;
    /**
     * Thêm lưu ý sức khỏe
     */
    addHealthNote(note: string): void;
    /**
     * Kiểm tra xem đã đến lúc nhắc Sếp đứng dậy nghỉ ngơi chưa (mặc định 45 phút)
     */
    checkHealthBreakNeeded(): {
        needed: boolean;
        minutesSitting: number;
        message?: string;
    };
    /**
     * Truy xuất ngữ cảnh tóm tắt về Sếp để nạp vào Prompt
     */
    getPromptContext(): string;
    /**
     * Tự động trích xuất thông tin mới từ câu nói của Sếp (Extraction Heuristics)
     */
    extractFactFromText(text: string): {
        extracted: boolean;
        category?: string;
        summary?: string;
    };
}
export declare const globalBossMemory: BossMemoryHub;
