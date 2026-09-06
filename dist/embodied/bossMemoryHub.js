// src/embodied/bossMemoryHub.ts
// BOW CON V4.0 — EPISODIC BOSS MEMORY & MULTI-USER PARTITIONED LIFE COMPANION ENGINE
import fs from 'node:fs';
import path from 'node:path';
import { DurableJsonStore } from '../core/persistence/durableJsonStore.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from '../core/persistence/userPartitionResolver.js';
import { validateBossProfile } from './schemas/bossMemorySchemas.js';
const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_PARTITIONS_DIR = path.join(DEFAULT_DATA_DIR, 'bossMemory');
const LEGACY_MEMORY_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'bossMemory.json');
export class BossMemoryHub {
    baseDir;
    legacyFilePath;
    singleFileOverride;
    stores = new Map();
    constructor(customBaseDirOrFilePath, customLegacyFilePathOrAllowedDir) {
        if (customBaseDirOrFilePath && customBaseDirOrFilePath.endsWith('.json')) {
            // Backward compatibility with single-file tests (customFilePath, allowedBaseDir)
            this.baseDir = path.dirname(customBaseDirOrFilePath);
            this.singleFileOverride = customBaseDirOrFilePath;
            this.legacyFilePath =
                customLegacyFilePathOrAllowedDir && customLegacyFilePathOrAllowedDir.endsWith('.json')
                    ? customLegacyFilePathOrAllowedDir
                    : LEGACY_MEMORY_FILE_PATH;
        }
        else {
            this.baseDir = customBaseDirOrFilePath || DEFAULT_PARTITIONS_DIR;
            this.legacyFilePath = customLegacyFilePathOrAllowedDir || LEGACY_MEMORY_FILE_PATH;
        }
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
        if (this.singleFileOverride) {
            this.getProfile();
        }
    }
    /**
     * Resolve or initialize the isolated DurableJsonStore for the specified user.
     */
    getStore(userId) {
        const targetUserId = userId || DEFAULT_PRIMARY_USER_ID;
        const partition = resolveUserPartition(targetUserId, this.baseDir);
        const targetFilePath = this.singleFileOverride || partition.filePath;
        const cacheKey = this.singleFileOverride ? '__single_file__' : partition.partitionKey;
        if (this.stores.has(cacheKey)) {
            return this.stores.get(cacheKey);
        }
        // Deterministic, idempotent legacy migration: ONLY for primary configured owner
        if (!this.singleFileOverride &&
            partition.userId === DEFAULT_PRIMARY_USER_ID &&
            !fs.existsSync(partition.filePath)) {
            if (fs.existsSync(this.legacyFilePath) && fs.statSync(this.legacyFilePath).isFile()) {
                try {
                    const migrationStore = new DurableJsonStore({
                        filePath: this.legacyFilePath,
                        validator: validateBossProfile,
                        defaultFactory: () => this.getDefaultProfile(DEFAULT_PRIMARY_USER_ID),
                        allowedBaseDir: path.dirname(this.legacyFilePath),
                        quarantineCorrupted: false,
                    });
                    const migratedData = migrationStore.read();
                    const targetStore = new DurableJsonStore({
                        filePath: partition.filePath,
                        validator: validateBossProfile,
                        defaultFactory: () => migratedData,
                        allowedBaseDir: this.baseDir,
                        quarantineCorrupted: true,
                    });
                    targetStore.write(migratedData);
                }
                catch (err) {
                    console.warn('[BossMemoryHub] Legacy migration skipped or failed:', err);
                }
            }
        }
        const store = new DurableJsonStore({
            filePath: targetFilePath,
            validator: validateBossProfile,
            defaultFactory: () => this.getDefaultProfile(partition.userId),
            allowedBaseDir: this.baseDir,
            quarantineCorrupted: true,
        });
        this.stores.set(cacheKey, store);
        return store;
    }
    getDefaultProfile(userId) {
        const isPrimary = !userId || userId === DEFAULT_PRIMARY_USER_ID;
        return {
            name: isPrimary ? 'Ngài Hoàn' : `Người dùng (${userId})`,
            title: isPrimary ? 'Ngài' : 'Sếp',
            habits: {
                morningRoutine: 'Thức dậy và làm việc lúc 8:00 sáng',
                preferredBeverage: 'Cà phê đen ít đường lúc 8:00 sáng',
                workStartHour: 8,
                breakIntervalMinutes: 45,
                favoriteMusicGenre: 'Nhạc không lời Lofi tập trung code',
            },
            projects: isPrimary
                ? [
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
                ]
                : [],
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
    getProfile(userId) {
        return this.getStore(userId).read();
    }
    saveMemory(userIdOrProfile, maybeProfile) {
        let userId;
        let profileToSave;
        if (typeof userIdOrProfile === 'string') {
            userId = userIdOrProfile;
            profileToSave = maybeProfile || this.getProfile(userId);
        }
        else {
            userId = DEFAULT_PRIMARY_USER_ID;
            profileToSave = userIdOrProfile;
        }
        this.getStore(userId).write(profileToSave);
    }
    /**
     * Ghi nhớ một sở thích hoặc thói quen mới của Sếp
     */
    rememberHabit(userIdOrKey, keyOrValue, maybeValue) {
        let userId;
        let key;
        let value;
        if (maybeValue !== undefined) {
            userId = userIdOrKey;
            key = keyOrValue;
            value = maybeValue;
        }
        else {
            userId = DEFAULT_PRIMARY_USER_ID;
            key = userIdOrKey;
            value = keyOrValue;
        }
        const store = this.getStore(userId);
        const current = store.read();
        const updated = {
            ...current,
            habits: { ...current.habits, [key]: value },
            lastInteractionTimestamp: Date.now(),
        };
        store.write(updated);
    }
    /**
     * Ghi nhớ hoặc cập nhật một dự án nghiên cứu của Sếp
     */
    addOrUpdateProject(userIdOrProject, maybeProject) {
        let userId;
        let project;
        if (maybeProject !== undefined) {
            userId = userIdOrProject;
            project = maybeProject;
        }
        else {
            userId = DEFAULT_PRIMARY_USER_ID;
            project = userIdOrProject;
        }
        const store = this.getStore(userId);
        const current = store.read();
        const existingIdx = current.projects.findIndex(p => p.id === project.id || p.name.toLowerCase() === project.name.toLowerCase());
        const fullProject = {
            ...project,
            updatedAt: new Date().toISOString(),
        };
        const newProjects = [...current.projects];
        if (existingIdx >= 0) {
            newProjects[existingIdx] = fullProject;
        }
        else {
            newProjects.push(fullProject);
        }
        const updated = {
            ...current,
            projects: newProjects,
            lastInteractionTimestamp: Date.now(),
        };
        store.write(updated);
        return fullProject;
    }
    /**
     * Thêm lưu ý sức khỏe
     */
    addHealthNote(userIdOrNote, maybeNote) {
        let userId;
        let note;
        if (maybeNote !== undefined) {
            userId = userIdOrNote;
            note = maybeNote;
        }
        else {
            userId = DEFAULT_PRIMARY_USER_ID;
            note = userIdOrNote;
        }
        const store = this.getStore(userId);
        const current = store.read();
        if (!current.healthNotes.includes(note)) {
            const updated = {
                ...current,
                healthNotes: [...current.healthNotes, note],
                lastInteractionTimestamp: Date.now(),
            };
            store.write(updated);
        }
    }
    /**
     * Kiểm tra xem đã đến lúc nhắc Sếp đứng dậy nghỉ ngơi chưa (mặc định 45 phút)
     */
    checkHealthBreakNeeded(userId) {
        const store = this.getStore(userId);
        const current = store.read();
        const now = Date.now();
        const elapsedMinutes = Math.floor((now - current.lastBreakReminderTimestamp) / 60000);
        const limit = current.habits.breakIntervalMinutes || 45;
        if (elapsedMinutes >= limit) {
            const updated = {
                ...current,
                lastBreakReminderTimestamp: now,
            };
            store.write(updated);
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
    getPromptContext(userId) {
        const profile = this.getProfile(userId);
        const activeProjects = profile.projects
            .filter(p => p.status === 'active')
            .map(p => `• **${p.name}**: ${p.description} (Tech: ${p.techStack.join(', ')})`)
            .join('\n');
        return `
=== HỒ SƠ & TRÍ NHỚ VỀ SẾP (BOSS MEMORY HUB) ===
• Tên/Cách xưng hô: ${profile.name} (${profile.title})
• Thói quen đồ uống: ${profile.habits.preferredBeverage || 'Chưa cập nhật'}
• Giờ làm việc: ${profile.habits.morningRoutine || '8:00 sáng'}
• Dự án Sếp đang theo đuổi:
${activeProjects || 'Không có dự án nào'}
• Nhắc nhở sức khỏe: ${profile.healthNotes.join('; ')}
================================================
`.trim();
    }
    /**
     * Tự động trích xuất thông tin mới từ câu nói của Sếp (Extraction Heuristics)
     */
    extractFactFromText(text, userId) {
        const lower = text.toLowerCase();
        // Nếu là câu hỏi (chứa '?', 'gì', 'nhỉ', 'không', 'chăng') -> Không extract fact mới mà để intent recall xử lý
        const isQuestion = lower.includes('?') ||
            lower.includes('gì') ||
            lower.includes('nhỉ') ||
            lower.includes('không') ||
            lower.includes('chăng');
        if (isQuestion) {
            return { extracted: false };
        }
        // 1. Nhận diện sở thích cà phê / đồ uống
        if (lower.includes('thích uống') || lower.includes('uống cà phê') || lower.includes('thói quen')) {
            const match = text.match(/(thích uống|thường uống|uống)\s+([^.,\n]+)/i);
            if (match && match[2]) {
                const beverage = match[2].trim();
                this.rememberHabit(userId || DEFAULT_PRIMARY_USER_ID, 'preferredBeverage', beverage);
                return { extracted: true, category: 'habits', summary: `Đã ghi nhớ thói quen uống: "${beverage}"` };
            }
        }
        // 2. Nhận diện dự án mới
        if (lower.includes('đang làm dự án') || lower.includes('đang nghiên cứu') || lower.includes('đang code')) {
            const projMatch = text.match(/(đang làm dự án|đang nghiên cứu|đang code|làm)\s+([^.,\n]+)/i);
            if (projMatch && projMatch[2]) {
                const projName = projMatch[2].trim();
                const newProj = this.addOrUpdateProject(userId || DEFAULT_PRIMARY_USER_ID, {
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
