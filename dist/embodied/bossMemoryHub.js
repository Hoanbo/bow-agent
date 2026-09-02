// src/embodied/bossMemoryHub.ts
// BOW CON V4.0 — EPISODIC BOSS MEMORY & LIFE COMPANION ENGINE
import fs from 'node:fs';
import path from 'node:path';
const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const MEMORY_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'bossMemory.json');
export class BossMemoryHub {
    profile;
    filePath;
    constructor(customFilePath) {
        this.filePath = customFilePath || MEMORY_FILE_PATH;
        this.profile = this.loadMemory();
    }
    getDefaultProfile() {
        return {
            name: 'Ngài Hoàn',
            title: 'Ngài',
            habits: {
                morningRoutine: 'Thức dậy và làm việc lúc 8:00 sáng',
                preferredBeverage: 'Cà phê đen ít đường lúc 8:00 sáng',
                workStartHour: 8,
                breakIntervalMinutes: 45,
                favoriteMusicGenre: 'Nhạc không lời Lofi tập trung code',
            },
            projects: [
                {
                    id: 'proj_bow_robot',
                    name: 'Robot Tự Hành BOW Robot',
                    description: 'Robot thông minh phần cứng ESP32, màn hình OLED mắt cảm xúc, servo xoay và mic thu âm 2 chiều.',
                    techStack: ['ESP32', 'C++', 'WebRTC', 'TypeScript', 'Piper TTS'],
                    status: 'active',
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'proj_shopofbow',
                    name: 'Shop of BOW E-Commerce',
                    description: 'Hệ sinh thái thương mại dịch vụ số, bán tự động (on-demand fulfillment).',
                    techStack: ['React', 'Vite', 'TailwindCSS', 'Supabase'],
                    status: 'active',
                    updatedAt: new Date().toISOString(),
                },
            ],
            healthNotes: [
                'Cần đứng dậy vươn vai sau 45 phút ngồi code liên tục để bảo vệ cột sống và mắt.',
                'Nhắc nhở uống đủ 2 lít nước mỗi ngày.',
            ],
            relationships: [
                { name: 'BOWCON', role: 'AI Đồng hành & Trợ lý trung thành tuyệt đối', notes: 'Trợ lý AI trung thành phụng sự Ngài' },
            ],
            customPreferences: {
                voiceSpeed: '1.0',
                tone: 'Thân thương, kính trọng, trung thành, thông thái',
            },
            lastInteractionTimestamp: Date.now(),
            lastBreakReminderTimestamp: Date.now(),
        };
    }
    loadMemory() {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf8');
                return JSON.parse(raw);
            }
        }
        catch (err) {
            console.warn(`[BossMemoryHub] Could not load memory file, using default:`, err);
        }
        const def = this.getDefaultProfile();
        this.saveMemory(def);
        return def;
    }
    saveMemory(profileToSave) {
        const target = profileToSave || this.profile;
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.filePath, JSON.stringify(target, null, 2), 'utf8');
        }
        catch (err) {
            console.error(`[BossMemoryHub] Failed to save memory:`, err);
        }
    }
    getProfile() {
        return this.profile;
    }
    /**
     * Ghi nhớ một sở thích hoặc thói quen mới của Sếp
     */
    rememberHabit(key, value) {
        this.profile.habits[key] = value;
        this.profile.lastInteractionTimestamp = Date.now();
        this.saveMemory();
    }
    /**
     * Ghi nhớ hoặc cập nhật một dự án nghiên cứu của Sếp
     */
    addOrUpdateProject(project) {
        const existingIdx = this.profile.projects.findIndex(p => p.id === project.id || p.name.toLowerCase() === project.name.toLowerCase());
        const fullProject = {
            ...project,
            updatedAt: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
            this.profile.projects[existingIdx] = fullProject;
        }
        else {
            this.profile.projects.push(fullProject);
        }
        this.profile.lastInteractionTimestamp = Date.now();
        this.saveMemory();
        return fullProject;
    }
    /**
     * Thêm lưu ý sức khỏe
     */
    addHealthNote(note) {
        if (!this.profile.healthNotes.includes(note)) {
            this.profile.healthNotes.push(note);
            this.saveMemory();
        }
    }
    /**
     * Kiểm tra xem đã đến lúc nhắc Sếp đứng dậy nghỉ ngơi chưa (mặc định 45 phút)
     */
    checkHealthBreakNeeded() {
        const now = Date.now();
        const elapsedMinutes = Math.floor((now - this.profile.lastBreakReminderTimestamp) / 60000);
        const limit = this.profile.habits.breakIntervalMinutes || 45;
        if (elapsedMinutes >= limit) {
            this.profile.lastBreakReminderTimestamp = now;
            this.saveMemory();
            return {
                needed: true,
                minutesSitting: elapsedMinutes,
                message: `Thưa Ngài! Ngài đã ngồi code liên tục ${elapsedMinutes} phút rồi đấy ạ. Ngài hãy đứng dậy vươn vai, uống một ngụm nước và cho mắt nghỉ ngơi 5 phút nhé!`,
            };
        }
        return { needed: false, minutesSitting: elapsedMinutes };
    }
    /**
     * Truy xuất ngữ cảnh tóm tắt về Sếp để nạp vào Prompt
     */
    getPromptContext() {
        const activeProjects = this.profile.projects
            .filter(p => p.status === 'active')
            .map(p => `• **${p.name}**: ${p.description} (Tech: ${p.techStack.join(', ')})`)
            .join('\n');
        return `
=== HỒ SƠ & TRÍ NHỚ VỀ SẾP (BOSS MEMORY HUB) ===
• Tên/Cách xưng hô: ${this.profile.name} (${this.profile.title})
• Thói quen đồ uống: ${this.profile.habits.preferredBeverage || 'Chưa cập nhật'}
• Giờ làm việc: ${this.profile.habits.morningRoutine || '8:00 sáng'}
• Dự án Sếp đang theo đuổi:
${activeProjects || 'Không có dự án nào'}
• Nhắc nhở sức khỏe: ${this.profile.healthNotes.join('; ')}
================================================
`.trim();
    }
    /**
     * Tự động trích xuất thông tin mới từ câu nói của Sếp (Extraction Heuristics)
     */
    extractFactFromText(text) {
        const lower = text.toLowerCase();
        // Nếu là câu hỏi (chứa '?', 'gì', 'nhỉ', 'không', 'chăng') -> Không extract fact mới mà để intent recall xử lý
        const isQuestion = lower.includes('?') || lower.includes('gì') || lower.includes('nhỉ') || lower.includes('không') || lower.includes('chăng');
        if (isQuestion) {
            return { extracted: false };
        }
        // 1. Nhận diện sở thích cà phê / đồ uống
        if (lower.includes('thích uống') || lower.includes('uống cà phê') || lower.includes('thói quen')) {
            const match = text.match(/(thích uống|thường uống|uống)\s+([^.,\n]+)/i);
            if (match && match[2]) {
                const beverage = match[2].trim();
                this.rememberHabit('preferredBeverage', beverage);
                return { extracted: true, category: 'habits', summary: `Đã ghi nhớ thói quen uống: "${beverage}"` };
            }
        }
        // 2. Nhận diện dự án mới
        if (lower.includes('đang làm dự án') || lower.includes('đang nghiên cứu') || lower.includes('đang code')) {
            const projMatch = text.match(/(đang làm dự án|đang nghiên cứu|đang code|làm)\s+([^.,\n]+)/i);
            if (projMatch && projMatch[2]) {
                const projName = projMatch[2].trim();
                const newProj = this.addOrUpdateProject({
                    id: 'proj_' + Date.now(),
                    name: projName,
                    description: `Dự án do Sếp chia sẻ: "${projName}"`,
                    techStack: ['Chưa xác định'],
                    status: 'active',
                });
                return { extracted: true, category: 'projects', summary: `Đã ghi nhận dự án mới: "${newProj.name}"` };
            }
        }
        return { extracted: false };
    }
}
// Global Singleton Instance
export const globalBossMemory = new BossMemoryHub();
