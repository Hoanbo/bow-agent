// src/embodied/bossFeedbackLearner.ts
// BOW CON V4.0 — REINFORCEMENT LEARNING FROM BOSS FEEDBACK & CORRECTION

import fs from 'node:fs';
import path from 'node:path';

export interface BossRule {
  id: string;
  pattern: string; // Điều kiện nhận diện hoặc từ khóa
  instruction: string; // Lệnh/Quy tắc Sếp dạy
  category: 'addressing' | 'policy' | 'behavior' | 'shop_knowledge';
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
}

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const RULES_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'customBossRules.json');

export class BossFeedbackLearner {
  private rules: BossRule[];
  private filePath: string;

  constructor(customFilePath?: string) {
    this.filePath = customFilePath || RULES_FILE_PATH;
    this.rules = this.loadRules();
  }

  private getDefaultRules(): BossRule[] {
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

  private loadRules(): BossRule[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`[BossFeedbackLearner] Could not load rules file, using default:`, err);
    }
    const def = this.getDefaultRules();
    this.saveRules(def);
    return def;
  }

  public saveRules(rulesToSave?: BossRule[]): void {
    const target = rulesToSave || this.rules;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(target, null, 2), 'utf8');
    } catch (err) {
      console.error(`[BossFeedbackLearner] Failed to save rules:`, err);
    }
  }

  public getRules(): BossRule[] {
    return this.rules.filter(r => r.enabled);
  }

  /**
   * Thêm hoặc cập nhật một quy tắc do Sếp dạy
   */
  public addRule(rule: Omit<BossRule, 'id' | 'createdAt' | 'updatedAt' | 'enabled'>): BossRule {
    const id = 'rule_' + Date.now();
    const newRule: BossRule = {
      ...rule,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: true,
    };
    this.rules.push(newRule);
    this.saveRules();
    return newRule;
  }

  /**
   * Phân tích câu nói của Sếp xem có chứa tín hiệu "Sửa sai / Dạy dỗ" không
   */
  public detectCorrectionPattern(userText: string): { isCorrection: boolean; learnedRule?: BossRule; replyMessage?: string } {
    const lower = userText.toLowerCase().trim();

    // 1. Sửa xưng hô: "hãy xưng là con với anh", "từ nay xưng con nhé", "đừng xưng tôi"
    if (
      lower.includes('xưng là con') ||
      lower.includes('hãy xưng là con') ||
      lower.includes('gọi anh là sếp') ||
      lower.includes('gọi là ba') ||
      lower.includes('đừng xưng tôi') ||
      lower.includes('không được xưng tôi')
    ) {
      const rule = this.addRule({
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
          const rule = this.addRule({
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
  public getPromptInjections(): string {
    const activeRules = this.getRules();
    if (activeRules.length === 0) return '';

    return `
=== QUY TẮC BẮT BUỘC DO SẾP DẠY (CUSTOM BOSS RULES) ===
${activeRules.map((r, i) => `${i + 1}. [${r.category.toUpperCase()}] ${r.instruction}`).join('\n')}
========================================================
`.trim();
  }
}

// Global Singleton Instance
export const globalBossFeedback = new BossFeedbackLearner();
