// src/skills/dynamicSkillManager.ts
// BOW CON V4.0 — DYNAMIC SKILL REGISTRY & LIVE TOOL SYNTHESIS
import fs from 'node:fs';
import path from 'node:path';
import { toolRegistry } from '../tools/registry.js';
import { CONFIG } from '../config.js';
import { globalIsolatedRunner } from './isolatedRunner.js';
export * from './isolatedRunner.js';
const DEFAULT_SKILLS_DIR = path.resolve(process.cwd(), 'data', 'dynamicSkills');
export class DynamicSkillManager {
    skillsDir;
    skills = new Map();
    dynamicCodeOverride = null;
    constructor(customDir) {
        this.skillsDir = customDir || DEFAULT_SKILLS_DIR;
        this.initStorage();
        this.loadAllSkills();
    }
    setDynamicCodeEnabled(enabled) {
        this.dynamicCodeOverride = enabled;
    }
    isDynamicCodeEnabled() {
        return this.dynamicCodeOverride !== null ? this.dynamicCodeOverride : CONFIG.dynamicCodeEnabled;
    }
    initStorage() {
        if (!fs.existsSync(this.skillsDir)) {
            fs.mkdirSync(this.skillsDir, { recursive: true });
        }
    }
    validateCodeSafety(code) {
        const forbiddenPatterns = [
            /\bprocess\.env\b/i,
            /\bchild_process\b/i,
            /\bfs\b/i,
            /\brequire\s*\(/i,
            /\bimport\s*\(/i,
            /\bprocess\.exit\b/i,
        ];
        for (const pattern of forbiddenPatterns) {
            if (pattern.test(code)) {
                throw new Error(`DYNAMIC_CODE_SECURITY_VIOLATION: Code contains forbidden pattern: ${pattern}`);
            }
        }
    }
    loadAllSkills() {
        if (!this.isDynamicCodeEnabled()) {
            console.warn('[DynamicSkillManager] Dynamic code is disabled by production policy.');
            return;
        }
        try {
            const files = fs.readdirSync(this.skillsDir);
            const secret = CONFIG.shopWebhookSecret || 'bow_dynamic_skill_secret';
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.skillsDir, file);
                    const raw = fs.readFileSync(filePath, 'utf8');
                    const skill = JSON.parse(raw);
                    // Verify artifact signature if present
                    if (skill.signature) {
                        const isValid = globalIsolatedRunner.verifySkillArtifact(skill.id, skill.code, skill.signature, secret);
                        if (!isValid) {
                            console.error(`[DynamicSkillManager] Signature mismatch for skill "${skill.id}". Quarantined.`);
                            globalIsolatedRunner.quarantineSkill(skill.id);
                            skill.isQuarantined = true;
                            this.skills.set(skill.id, skill);
                            continue; // Do not register quarantined skill
                        }
                    }
                    this.skills.set(skill.id, skill);
                    this.hotRegisterToToolRegistry(skill);
                }
            }
            console.log(`[DynamicSkillManager] Loaded and hot-registered ${this.skills.size} dynamic skills.`);
        }
        catch (err) {
            console.warn(`[DynamicSkillManager] Error loading skills from disk:`, err);
        }
    }
    /**
     * Đăng ký nóng (Hot-registration) một skill động vào Tool Registry của Agent
     */
    hotRegisterToToolRegistry(skill) {
        toolRegistry.register({
            name: skill.id,
            description: `[DYNAMIC SKILL] ${skill.description} (Tác giả: ${skill.author})`,
            parameters: {
                type: 'object',
                properties: skill.parametersSchema || {},
            },
            execute: async (args, context) => {
                return this.executeSkill(skill.id, args, context);
            },
        });
    }
    /**
     * Thêm hoặc cập nhật một kỹ năng mới
     * Thêm hoặc cập nhật một kỹ năng mới với chữ ký số toàn vẹn
     */
    registerSkill(skillDraft) {
        if (!this.isDynamicCodeEnabled()) {
            throw new Error('DYNAMIC_CODE_DISABLED_BY_POLICY');
        }
        this.validateCodeSafety(skillDraft.code);
        const secret = CONFIG.shopWebhookSecret || 'bow_dynamic_skill_secret';
        const signature = globalIsolatedRunner.signSkillArtifact(skillDraft.id, skillDraft.code, secret);
        const skill = {
            ...skillDraft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            executionCount: 0,
            signature,
            isQuarantined: false,
        };
        this.skills.set(skill.id, skill);
        // Lưu ra đĩa
        // Lưu ra đĩa kèm chữ ký
        const filePath = path.join(this.skillsDir, `${skill.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(skill, null, 2), 'utf8');
        // Hot-register vào Tool Registry
        this.hotRegisterToToolRegistry(skill);
        return skill;
    }
    getSkill(id) {
        return this.skills.get(id);
    }
    listSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * Thực thi một kỹ năng động trong môi trường Sandbox
     */
    async executeSkill(id, args, context) {
        if (!this.isDynamicCodeEnabled()) {
            return { success: false, error: 'DYNAMIC_CODE_DISABLED_BY_POLICY', executionTimeMs: 0 };
        }
        if (globalIsolatedRunner.isQuarantined(id)) {
            return { success: false, error: `SKILL_QUARANTINED: Skill "${id}" is quarantined due to security or integrity violation.`, executionTimeMs: 0 };
        }
        const skill = this.skills.get(id);
        if (!skill) {
            return { success: false, error: `Skill "${id}" không tồn tại trong kho kỹ năng động.`, executionTimeMs: 0 };
        }
        const startTime = Date.now();
        try {
            // Thực thi code thông qua M3 Isolated Sandbox Runner (loại bỏ hoàn toàn AsyncFunction trên host)
            const sandboxRes = await globalIsolatedRunner.executeInSandbox(skill.code, { args, context });
            if (!sandboxRes.success) {
                throw new Error(sandboxRes.error || 'Lỗi thực thi mã trong sandbox');
            }
            const result = sandboxRes.result;
            const executionTimeMs = Date.now() - startTime;
            skill.executionCount++;
            skill.lastExecutionSuccess = true;
            skill.updatedAt = new Date().toISOString();
            this.saveSkillToDisk(skill);
            return {
                success: true,
                result,
                executionTimeMs,
            };
        }
        catch (err) {
            const executionTimeMs = Date.now() - startTime;
            skill.executionCount++;
            skill.lastExecutionSuccess = false;
            skill.updatedAt = new Date().toISOString();
            this.saveSkillToDisk(skill);
            return {
                success: false,
                error: err?.message || 'Lỗi thực thi mã kỹ năng động.',
                executionTimeMs,
            };
        }
    }
    saveSkillToDisk(skill) {
        try {
            const filePath = path.join(this.skillsDir, `${skill.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(skill, null, 2), 'utf8');
        }
        catch (err) {
            console.warn(`[DynamicSkillManager] Failed to update skill on disk:`, err);
        }
    }
}
// Global Singleton Instance
export const globalSkillManager = new DynamicSkillManager();
