// src/skills/dynamicSkillManager.ts
// BOW CON V4.0 — DYNAMIC SKILL REGISTRY & LIVE TOOL SYNTHESIS

import fs from 'node:fs';
import path from 'node:path';
import { toolRegistry } from '../tools/registry.js';
import { CONFIG } from '../config.js';
import { globalIsolatedRunner } from './isolatedRunner.js';

export * from './isolatedRunner.js';

export interface DynamicSkill {
  id: string; // e.g., "skill_hardware_calc", "skill_gold_tracker"
  name: string;
  description: string;
  code: string; // JavaScript/TypeScript executable snippet
  parametersSchema: Record<string, any>;
  author: 'boss' | 'bow_con_synthesized';
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastExecutionSuccess?: boolean;
  signature?: string;
  isQuarantined?: boolean;
}

const DEFAULT_SKILLS_DIR = path.resolve(process.cwd(), 'data', 'dynamicSkills');

export class DynamicSkillManager {
  private skillsDir: string;
  private skills: Map<string, DynamicSkill> = new Map();
  private dynamicCodeOverride: boolean | null = null;

  constructor(customDir?: string) {
    this.skillsDir = customDir || DEFAULT_SKILLS_DIR;
    this.initStorage();
    this.loadAllSkills();
  }

  public setDynamicCodeEnabled(enabled: boolean): void {
    this.dynamicCodeOverride = enabled;
  }

  public isDynamicCodeEnabled(): boolean {
    return this.dynamicCodeOverride !== null ? this.dynamicCodeOverride : CONFIG.dynamicCodeEnabled;
  }

  private initStorage(): void {
    if (!fs.existsSync(this.skillsDir)) {
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }
  }

  private validateCodeSafety(code: string): void {
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

  private loadAllSkills(): void {
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
          const skill: DynamicSkill = JSON.parse(raw);

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
    } catch (err) {
      console.warn(`[DynamicSkillManager] Error loading skills from disk:`, err);
    }
  }

  /**
   * Đăng ký nóng (Hot-registration) một skill động vào Tool Registry của Agent
   */
  public hotRegisterToToolRegistry(skill: DynamicSkill): void {
    toolRegistry.register({
      name: skill.id,
      description: `[DYNAMIC SKILL] ${skill.description} (Tác giả: ${skill.author})`,
      parameters: {
        type: 'object',
        properties: skill.parametersSchema || {},
      },
      execute: async (args: any, context: any) => {
        return this.executeSkill(skill.id, args, context);
      },
    });
  }

  /**
   * Thêm hoặc cập nhật một kỹ năng mới
   * Thêm hoặc cập nhật một kỹ năng mới với chữ ký số toàn vẹn
   */
  public registerSkill(skillDraft: Omit<DynamicSkill, 'createdAt' | 'updatedAt' | 'executionCount'>): DynamicSkill {
    if (!this.isDynamicCodeEnabled()) {
      throw new Error('DYNAMIC_CODE_DISABLED_BY_POLICY');
    }
    this.validateCodeSafety(skillDraft.code);

    const secret = CONFIG.shopWebhookSecret || 'bow_dynamic_skill_secret';
    const signature = globalIsolatedRunner.signSkillArtifact(skillDraft.id, skillDraft.code, secret);

    const skill: DynamicSkill = {
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

  public getSkill(id: string): DynamicSkill | undefined {
    return this.skills.get(id);
  }

  public listSkills(): DynamicSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Thực thi một kỹ năng động trong môi trường Sandbox
   */
  public async executeSkill(
    id: string,
    args: Record<string, any>,
    context?: any
  ): Promise<{ success: boolean; result?: any; error?: string; executionTimeMs: number }> {
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
    } catch (err: any) {
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

  private saveSkillToDisk(skill: DynamicSkill): void {
    try {
      const filePath = path.join(this.skillsDir, `${skill.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(skill, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[DynamicSkillManager] Failed to update skill on disk:`, err);
    }
  }
}

// Global Singleton Instance
export const globalSkillManager = new DynamicSkillManager();
