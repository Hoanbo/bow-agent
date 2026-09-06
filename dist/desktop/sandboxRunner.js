// src/desktop/sandboxRunner.ts
// BOW CON V4.0 — AUTONOMOUS CODE SANDBOX & SELF-DEBUGGING RUNNER
import vm from 'node:vm';
import { globalSkillManager } from '../skills/dynamicSkillManager.js';
import { globalIsolatedRunner } from '../skills/isolatedRunner.js';
export class SandboxRunner {
    timeoutMs;
    constructor(timeoutMs = 5000) {
        this.timeoutMs = timeoutMs;
    }
    /**
     * Kiểm tra cú pháp mã code JavaScript/TypeScript an toàn thông qua vm.Script
     */
    validateSyntax(code) {
        try {
            new vm.Script(`"use strict"; (function(args, context) { ${code} });`);
            return { valid: true };
        }
        catch (err) {
            return { valid: false, error: err?.message || 'Cú pháp JavaScript/TypeScript không hợp lệ' };
        }
    }
    /**
     * Chạy thử nghiệm mã code trong môi trường Sandbox cách ly
     */
    async executeInSandbox(code, testArgs = {}, context = {}) {
        const syntaxCheck = this.validateSyntax(code);
        if (!syntaxCheck.valid) {
            return {
                success: false,
                syntaxValid: false,
                canSynthesize: false,
                error: `[SYNTAX ERROR]: ${syntaxCheck.error}`,
                executionTimeMs: 0,
            };
        }
        const startTime = Date.now();
        try {
            const sandboxRes = await globalIsolatedRunner.executeInSandbox(code, { args: testArgs, context });
            const executionTimeMs = Date.now() - startTime;
            if (!sandboxRes.success) {
                return {
                    success: false,
                    syntaxValid: true,
                    canSynthesize: false,
                    error: `[RUNTIME ERROR]: ${sandboxRes.error}`,
                    executionTimeMs,
                };
            }
            return {
                success: true,
                syntaxValid: true,
                canSynthesize: true,
                output: sandboxRes.result,
                executionTimeMs,
            };
        }
        catch (err) {
            const executionTimeMs = Date.now() - startTime;
            return {
                success: false,
                syntaxValid: true,
                canSynthesize: false,
                error: `[RUNTIME ERROR]: ${err?.message || 'Lỗi không xác định khi chạy thử code'}`,
                executionTimeMs,
            };
        }
    }
    /**
     * Thử nghiệm và Tự động đóng gói thành Kỹ Năng Động (Self-Tool Synthesis)
     */
    async testAndSynthesizeSkill(draft) {
        const testResult = await this.executeInSandbox(draft.code, draft.testArgs || {}, {});
        if (!testResult.success) {
            return {
                success: false,
                debugFeedback: `Mã code chưa thể lưu thành Kỹ Năng Mới vì phát hiện lỗi:\n${testResult.error}\n👉 AI cần xem lại lỗi trên và tự sửa code trước khi đăng ký.`,
            };
        }
        // Đăng ký thành công vào DynamicSkillManager
        const synthesizedSkill = globalSkillManager.registerSkill({
            id: draft.id,
            name: draft.name,
            description: draft.description,
            code: draft.code,
            parametersSchema: draft.parametersSchema || {},
            author: draft.author || 'bow_con_synthesized',
        });
        return {
            success: true,
            synthesizedSkill,
            debugFeedback: `Chạy thử nghiệm thành công trong ${testResult.executionTimeMs}ms! Đã tự động đăng ký kỹ năng "${draft.name}" vào Tool Registry.`,
        };
    }
}
// Global Singleton Instance
export const globalSandboxRunner = new SandboxRunner();
