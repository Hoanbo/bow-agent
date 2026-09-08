// src/core/brain/brainModelProvider.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN MODEL PROVIDER ABSTRACTION
//
// The BrainModelProvider is the cognitive interface between the Brain
// and LLM backends. It is NOT an execution authority.
//
// INVARIANTS:
// LLM_PROPOSE != EXECUTE  — Provider outputs are proposals only
// LLM != SECURITY_AUTHORITY — Provider cannot override policy
// LLM != COMMIT_AUTHORITY   — Provider cannot commit results
// PROVIDER != TOOL_REGISTRY — Provider cannot directly invoke tools
//
// The Brain uses provider output to populate its internal plan,
// then submits that plan through the deterministic governance pipeline.
import { BrainError } from './brainFailure.js';
import { BRAIN_LLM_TIMEOUT_MS, } from './brainTypes.js';
// ---------------------------------------------------------------------------
// Deterministic Fallback Provider
// ---------------------------------------------------------------------------
// Used when no LLM is available or for OBSERVE/RECOMMEND class tasks.
// Produces structured plans without an LLM call.
export class DeterministicBrainModelProvider {
    providerName = 'deterministic';
    async understand(input, context) {
        // Parse intent from user text using simple keyword matching
        const lower = input.toLowerCase().trim();
        let toolName = 'brain_echo';
        let toolArgs = { input };
        if (lower.includes('create') && (lower.includes('file') || lower.includes('txt'))) {
            toolName = 'brain_fs_write';
            const match = input.match(/["']([^"']+\.(txt|md|json|log))["']/i);
            toolArgs = {
                path: match?.[1] ?? 'bowcon-output.txt',
                content: `BOWCON Brain created this file at ${new Date().toISOString()}\nInput: ${input}`,
            };
        }
        else if (lower.includes('read') && lower.includes('file')) {
            toolName = 'brain_fs_read';
            const match = input.match(/["']([^"']+\.(txt|md|json|log))["']/i);
            toolArgs = { path: match?.[1] ?? 'bowcon-output.txt' };
        }
        else if (lower.includes('update') || lower.includes('append') || lower.includes('modify')) {
            toolName = 'brain_fs_append';
            const match = input.match(/["']([^"']+\.(txt|md|json|log))["']/i);
            const contentMatch = input.match(/(?:with|content|text)[:\s]+["']?([^"'\n]{3,})["']?/i);
            toolArgs = {
                path: match?.[1] ?? 'bowcon-output.txt',
                content: contentMatch?.[1] ?? `Appended by BOWCON at ${new Date().toISOString()}`,
            };
        }
        else if (lower.includes('list') && lower.includes('file')) {
            toolName = 'brain_fs_list';
            toolArgs = { directory: 'data/brain' };
        }
        else if (lower.includes('delete') && lower.includes('file')) {
            toolName = 'brain_fs_delete';
            const match = input.match(/["']([^"']+\.(txt|md|json|log))["']/i);
            toolArgs = { path: match?.[1] ?? 'bowcon-output.txt' };
        }
        return {
            understanding: `Deterministic parse of: "${input}"`,
            reasoning: `Mapped to tool "${toolName}" based on keyword analysis.`,
            proposedToolName: toolName,
            proposedToolArgs: toolArgs,
            planSummary: `Execute ${toolName} with args: ${JSON.stringify(toolArgs)}`,
            confidence: 0.75,
            requiresConfirmation: false,
        };
    }
    async reason(plan, observations, _context) {
        const allMet = observations.every(o => o.toLowerCase().includes('met') || o.toLowerCase().includes('pass') || o.toLowerCase().includes('ok') || o.toLowerCase().includes('exists'));
        return allMet
            ? `All ${observations.length} observation(s) satisfied. Plan "${plan}" may proceed to commit.`
            : `One or more observations unmet. Recovery may be required.`;
    }
    async summarize(taskSummary) {
        return `Task ${taskSummary.taskId ?? 'unknown'} completed with status: ${taskSummary.success ? 'SUCCESS' : 'FAILURE'}.`;
    }
    async isAvailable() { return true; }
}
// ---------------------------------------------------------------------------
// Ollama Local Model Provider (optional; degrades to deterministic if unavailable)
// ---------------------------------------------------------------------------
export class OllamaModelProvider {
    providerName = 'ollama-local';
    endpoint;
    model;
    _available = undefined;
    constructor(endpoint = 'http://localhost:11434', model = 'qwen2.5:14b') {
        this.endpoint = endpoint;
        this.model = model;
    }
    async isAvailable() {
        if (this._available !== undefined)
            return this._available;
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`${this.endpoint}/api/tags`, { signal: controller.signal });
            clearTimeout(id);
            this._available = res.ok;
            return this._available;
        }
        catch {
            this._available = false;
            return false;
        }
    }
    async callOllama(prompt) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), BRAIN_LLM_TIMEOUT_MS);
        try {
            const res = await fetch(`${this.endpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: this.model, prompt, stream: false }),
                signal: controller.signal,
            });
            clearTimeout(id);
            if (!res.ok)
                throw new Error(`Ollama returned ${res.status}`);
            const json = await res.json();
            return json.response ?? '';
        }
        catch (e) {
            clearTimeout(id);
            if (e.name === 'AbortError') {
                throw new BrainError('BRAIN_MODEL_TIMEOUT', `Ollama call timed out after ${BRAIN_LLM_TIMEOUT_MS}ms`);
            }
            throw new BrainError('BRAIN_MODEL_UNAVAILABLE', e.message ?? 'Ollama call failed');
        }
    }
    async understand(input, _context) {
        const prompt = `You are BOWCON Brain. Analyze this user request and respond in JSON:
User: "${input}"
Respond ONLY with this JSON structure:
{
  "understanding": "<what user wants>",
  "reasoning": "<how to achieve it>",
  "proposedToolName": "<one of: brain_fs_write|brain_fs_read|brain_fs_append|brain_fs_list|brain_fs_delete|brain_echo>",
  "proposedToolArgs": { "<key>": "<value>" },
  "planSummary": "<brief plan>",
  "confidence": 0.9,
  "requiresConfirmation": false
}`;
        try {
            const raw = await this.callOllama(prompt);
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed;
            }
        }
        catch { /* fall through to deterministic */ }
        // Fallback to deterministic
        return new DeterministicBrainModelProvider().understand(input);
    }
    async reason(plan, observations, _context) {
        try {
            const prompt = `Given plan "${plan}" and these observations: ${observations.join('; ')} — should we commit or recover? Answer briefly.`;
            return await this.callOllama(prompt);
        }
        catch {
            return new DeterministicBrainModelProvider().reason(plan, observations);
        }
    }
    async summarize(taskSummary) {
        try {
            const prompt = `Summarize this task result in one sentence: ${JSON.stringify(taskSummary)}`;
            return await this.callOllama(prompt);
        }
        catch {
            return new DeterministicBrainModelProvider().summarize(taskSummary);
        }
    }
}
// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------
export function createBrainModelProvider(preferred = 'auto') {
    if (preferred === 'deterministic')
        return new DeterministicBrainModelProvider();
    if (preferred === 'ollama')
        return new OllamaModelProvider();
    // 'auto': try Ollama, fall back to deterministic
    return new OllamaModelProvider();
}
