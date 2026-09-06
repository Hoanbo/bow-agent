// src/embodied/bossFeedbackLearner.ts
// BOW CON V4.0 — REINFORCEMENT LEARNING FROM MULTI-USER BOSS FEEDBACK & CORRECTION
import fs from 'node:fs';
import path from 'node:path';
import { DurableJsonStore } from '../core/persistence/durableJsonStore.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from '../core/persistence/userPartitionResolver.js';
import { validateBossRules } from './schemas/bossMemorySchemas.js';
const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_PARTITIONS_DIR = path.join(DEFAULT_DATA_DIR, 'bossRules');
const LEGACY_RULES_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'customBossRules.json');
export class BossFeedbackLearner {
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
                    : LEGACY_RULES_FILE_PATH;
        }
        else {
            this.baseDir = customBaseDirOrFilePath || DEFAULT_PARTITIONS_DIR;
            this.legacyFilePath = customLegacyFilePathOrAllowedDir || LEGACY_RULES_FILE_PATH;
        }
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
        if (this.singleFileOverride) {
            this.getRules();
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
                        validator: validateBossRules,
                        defaultFactory: () => this.getDefaultRules(),
                        allowedBaseDir: path.dirname(this.legacyFilePath),
                        quarantineCorrupted: false,
                    });
                    const legacyRules = migrationStore.read();
                    const targetStore = new DurableJsonStore({
                        filePath: partition.filePath,
                        validator: validateBossRules,
                        defaultFactory: () => legacyRules,
                        allowedBaseDir: this.baseDir,
                        quarantineCorrupted: true,
                    });
                    targetStore.write(legacyRules);
                }
                catch (err) {
                    console.warn('[BossFeedbackLearner] Legacy rules migration skipped or failed:', err);
                }
            }
        }
        const store = new DurableJsonStore({
            filePath: targetFilePath,
            validator: validateBossRules,
            defaultFactory: () => this.getDefaultRules(),
            allowedBaseDir: this.baseDir,
            quarantineCorrupted: true,
        });
        this.stores.set(cacheKey, store);
        return store;
    }
    getDefaultRules() {
        return [
            {
                id: 'rule_addressing_sếp',
                pattern: 'xưng hô',
                instruction: 'Xưng là "Tôi" và gọi người dùng là "Ngài" với phong thái tôn nghiêm, chuyên nghiệp và trung thành tuyệt đối.',
                category: 'addressing',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                enabled: true,
            },
            {
                id: 'rule_proactive_care',
                pattern: 'sức khỏe',
                instruction: 'Luôn quan tâm nhắc nhở Sếp nghỉ ngơi khi ngồi làm việc quá 45 phút.',
                category: 'behavior',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                enabled: true,
            },
        ];
    }
    saveRules(userIdOrRules, maybeRules) {
        let userId;
        let rulesToSave;
        if (typeof userIdOrRules === 'string') {
            userId = userIdOrRules;
            rulesToSave = maybeRules || this.getRules(userId);
        }
        else {
            userId = DEFAULT_PRIMARY_USER_ID;
            rulesToSave = userIdOrRules;
        }
        this.getStore(userId).write(rulesToSave);
    }
    getRules(userId) {
        return this.getStore(userId).read().filter(r => r.enabled);
    }
    /**
     * Thêm hoặc cập nhật một quy tắc do Sếp dạy
     */
    addRule(userIdOrRule, maybeRule) {
        let userId;
        let rule;
        if (maybeRule !== undefined) {
            userId = userIdOrRule;
            rule = maybeRule;
        }
        else {
            userId = DEFAULT_PRIMARY_USER_ID;
            rule = userIdOrRule;
        }
        const store = this.getStore(userId);
        const current = store.read();
        const id = 'rule_' + Date.now();
        const newRule = {
            ...rule,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            enabled: true,
        };
        store.write([...current, newRule]);
        return newRule;
    }
    /**
     * Phân tích câu nói của Sếp xem có chứa tín hiệu "Sửa sai / Dạy dỗ" không
     */
    detectCorrectionPattern(userText, userId) {
        const lower = userText.toLowerCase().trim();
        const targetUserId = userId || DEFAULT_PRIMARY_USER_ID;
        // 1. Sửa xưng hô: "hãy xưng là con với anh", "từ nay xưng con nhé", "đừng xưng tôi"
        if (lower.includes('xưng là con') ||
            lower.includes('hãy xưng là con') ||
            lower.includes('gọi anh là sếp') ||
            lower.includes('gọi là ba') ||
            lower.includes('đừng xưng tôi') ||
            lower.includes('không được xưng tôi')) {
            const rule = this.addRule(targetUserId, {
                pattern: 'xưng hô cá nhân',
                instruction: 'Khi nói chuyện với Sếp, luôn xưng là "Con" và gọi là "Sếp" hoặc "Ba". Tuyệt đối không xưng là "Tôi".',
                category: 'addressing',
            });
            return {
                isCorrection: true,
                learnedRule: rule,
                replyMessage: 'Rõ thưa Ngài! Tôi đã ghi nhận quy tắc xưng hô: Tôi sẽ xưng là "Tôi" và gọi Ngài là "Ngài", luôn tôn nghiêm và trung thành tuyệt đối phụng sự Ngài!',
            };
        }
        // 2. Sửa chính sách / quy tắc: "từ nay phải...", "không được nói thế...", "nhớ là..."
        const correctionTriggers = ['từ nay phải', 'từ giờ phải', 'không được nói', 'nhớ là', 'quy tắc mới là'];
        for (const trig of correctionTriggers) {
            if (lower.includes(trig)) {
                const parts = userText.split(new RegExp(trig, 'i'));
                if (parts[1]) {
                    const instruction = parts[1].trim();
                    const rule = this.addRule(targetUserId, {
                        pattern: trig,
                        instruction,
                        category: 'policy',
                    });
                    return {
                        isCorrection: true,
                        learnedRule: rule,
                        replyMessage: `Rõ thưa Sếp! Tôi đã ghi nhớ quy tắc mới do Sếp dạy: "${instruction}". Tôi sẽ tuân thủ tuyệt đối từ nay về sau ạ!`,
                    };
                }
            }
        }
        return { isCorrection: false };
    }
    /**
     * Tạo văn bản Prompt nạp vào System Prompt
     */
    getPromptInjections(userId) {
        const activeRules = this.getRules(userId);
        if (activeRules.length === 0)
            return '';
        return `
=== QUY TẮC BẮT BUỘC DO SẾP DẠY (CUSTOM BOSS RULES) ===
${activeRules.map((r, i) => `${i + 1}. [${r.category.toUpperCase()}] ${r.instruction}`).join('\n')}
========================================================
`.trim();
    }
}
// Global Singleton Instance
export const globalBossFeedback = new BossFeedbackLearner();
