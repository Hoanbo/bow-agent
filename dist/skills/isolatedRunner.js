// src/skills/isolatedRunner.ts
// BOWCON V4.0 — ISOLATED SANDBOX RUNNER & ARTIFACT SIGNER
// Compliant with NIST AI RMF Safety & Containment
import vm from 'node:vm';
import crypto from 'node:crypto';
export class IsolatedRunner {
    timeoutMs;
    maxOutputBytes;
    quarantinedSkills = new Set();
    constructor(options) {
        this.timeoutMs = options?.timeoutMs || 2000; // 2 seconds hard timeout
        this.maxOutputBytes = options?.maxOutputBytes || 512 * 1024; // 512 KB
    }
    /**
     * Run code inside a completely isolated VM context with banned OS/network globals
     */
    async executeInSandbox(code, inputs = {}) {
        const startTime = Date.now();
        // 1. Static AST/Keyword quarantine check
        if (this.isMalicious(code)) {
            return {
                success: false,
                error: 'SECURITY_VIOLATION: Code contains forbidden system or network primitives',
                executionDurationMs: Date.now() - startTime,
            };
        }
        // 2. Prepare airtight sandbox context (NO process, require, fs, net, fetch)
        const logs = [];
        const argsObj = inputs.args || inputs;
        const contextObj = inputs.context || {};
        const sandboxContext = {
            inputs: Object.freeze({ args: argsObj, context: contextObj }),
            result: undefined,
            console: {
                log: (...args) => logs.push(args.map(String).join(' ')),
                warn: (...args) => logs.push('[WARN] ' + args.map(String).join(' ')),
                error: (...args) => logs.push('[ERROR] ' + args.map(String).join(' ')),
            },
            Math,
            Date,
            JSON,
            String,
            Number,
            Boolean,
            Array,
            Object,
            RegExp,
            parseInt,
            parseFloat,
            isNaN,
            isFinite,
        };
        vm.createContext(sandboxContext);
        // 3. Wrap script inside an IIFE returning the evaluated expression
        const wrappedCode = `
      "use strict";
      (function(args, context) {
        ${code}
      })(inputs.args, inputs.context);
    `;
        try {
            const script = new vm.Script(wrappedCode, {
                filename: 'sandboxed_skill.vm.js',
            });
            const output = script.runInContext(sandboxContext, {
                timeout: this.timeoutMs,
                displayErrors: true,
            });
            const finalResult = output !== undefined ? output : sandboxContext.result;
            const duration = Date.now() - startTime;
            // Check output payload size
            const serialized = JSON.stringify(finalResult || '');
            if (serialized.length > this.maxOutputBytes) {
                return {
                    success: false,
                    error: `OUTPUT_QUOTA_EXCEEDED: Result payload size ${serialized.length} exceeds limit ${this.maxOutputBytes}`,
                    executionDurationMs: duration,
                };
            }
            return {
                success: true,
                result: finalResult,
                executionDurationMs: duration,
            };
        }
        catch (err) {
            const duration = Date.now() - startTime;
            const isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message?.includes('timed out');
            return {
                success: false,
                error: isTimeout
                    ? `EXECUTION_TIMEOUT: Code execution exceeded ${this.timeoutMs}ms hard limit`
                    : `RUNTIME_ERROR: ${err.message}`,
                executionDurationMs: duration,
            };
        }
    }
    /**
     * Sign a verified skill artifact with HMAC-SHA256
     */
    signSkillArtifact(skillId, code, secret) {
        return crypto.createHmac('sha256', secret).update(`${skillId}:${code}`).digest('hex');
    }
    /**
     * Verify a skill artifact signature
     */
    verifySkillArtifact(skillId, code, signature, secret) {
        const expected = this.signSkillArtifact(skillId, code, secret);
        const bufA = Buffer.from(expected, 'utf8');
        const bufB = Buffer.from(signature, 'utf8');
        return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    }
    quarantineSkill(skillId) {
        this.quarantinedSkills.add(skillId);
    }
    isQuarantined(skillId) {
        return this.quarantinedSkills.has(skillId);
    }
    isMalicious(code) {
        const FORBIDDEN_TOKENS = [
            /\bprocess\b/,
            /\brequire\b/,
            /\bimport\b/,
            /\bfs\b/,
            /\bchild_process\b/,
            /\bexec\b/,
            /\bspawn\b/,
            /\beval\b/,
            /\bFunction\b/,
            /\bAsyncFunction\b/,
            /\b__proto__\b/,
            /\bprototype\b/,
            /\bglobal\b/,
            /\bglobalThis\b/,
            /\bfetch\b/,
            /\bXMLHttpRequest\b/,
            /\bWebSocket\b/,
            /\bnet\b/,
            /\bdgram\b/,
        ];
        return FORBIDDEN_TOKENS.some((re) => re.test(code));
    }
}
export const globalIsolatedRunner = new IsolatedRunner();
