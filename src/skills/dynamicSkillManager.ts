// src/skills/dynamicSkillManager.ts
// BOW CON V4.0 — DYNAMIC SKILL REGISTRY & LIVE TOOL SYNTHESIS

import fs from 'node:fs';
import path from 'node:path';
import { toolRegistry } from '../tools/registry.js';

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
}

const DEFAULT_SKILLS_DIR = path.resolve(process.cwd(), 'data', 'dynamicSkills');

export class DynamicSkillManager {
  private skillsDir: string;
  private skills: Map<string, DynamicSkill> = new Map();

  constructor(customDir?: string) {
    this.skillsDir = customDir || DEFAULT_SKILLS_DIR;
    this.initStorage();
    this.loadAllSkills();
  }

  private initStorage(): void {
    if (!fs.existsSync(this.skillsDir)) {
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }
  }

  private loadAllSkills(): void {
    try {
      const files = fs.readdirSync(this.skillsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.skillsDir, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const skill: DynamicSkill = JSON.parse(raw);
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
   */
  public registerSkill(skillDraft: Omit<DynamicSkill, 'createdAt' | 'updatedAt' | 'executionCount'>): DynamicSkill {
    const skill: DynamicSkill = {
      ...skillDraft,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionCount: 0,
    };

    this.skills.set(skill.id, skill);

    // Lưu ra đĩa
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
    const skill = this.skills.get(id);
    if (!skill) {
      return { success: false, error: `Skill "${id}" không tồn tại trong kho kỹ năng động.`, executionTimeMs: 0 };
    }

    const startTime = Date.now();
    try {
      // Thực thi code thông qua Function constructor có bảo vệ
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const runner = new AsyncFunction('args', 'context', skill.code);

      const result = await Promise.race([
        runner(args, context),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Skill execution timed out (limit: 5000ms)')), 5000)),
      ]);

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
