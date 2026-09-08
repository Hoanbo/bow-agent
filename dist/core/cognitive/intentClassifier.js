// src/core/cognitive/intentClassifier.ts
// BOWCON V4.0 — MS-1.3.32: STRUCTURED INTENT CLASSIFIER
//
// Invariants:
// UNKNOWN_INTENT == FAIL_SAFE
// INTENT != PRIVILEGE_GRANT
export class IntentClassifier {
    /**
     * Classifies an input string into one of the 13 authoritative intent categories.
     */
    static classify(input) {
        if (!input || typeof input !== 'string' || input.trim().length === 0) {
            return {
                intent: 'UNKNOWN',
                confidence: 1.0,
                recommendedCapability: 'none',
                riskLevel: 'LOW',
                rationale: 'Empty or blank input provided.',
            };
        }
        const trimmed = input.trim();
        const lower = trimmed.toLowerCase();
        // Extract potential target file if present (support quotes and Windows drive paths)
        const quotedMatch = trimmed.match(/["']([^"'\r\n]+\.(?:txt|md|json|log|ts|js))["']/i);
        const unquotedMatch = trimmed.match(/\b([a-zA-Z]:[\\/][^\s"']+\.(?:txt|md|json|log|ts|js)|[a-zA-Z0-9_\-./\\]+\.(?:txt|md|json|log|ts|js))\b/i);
        const targetFile = quotedMatch?.[1] || unquotedMatch?.[1];
        // 1. SYSTEM
        if (lower.startsWith('system') ||
            lower.includes('shutdown') ||
            lower.includes('restart') ||
            lower.includes('service status') ||
            lower.includes('health check') ||
            lower.includes('process id') ||
            lower.includes('pid')) {
            return {
                intent: 'SYSTEM',
                confidence: 0.95,
                recommendedCapability: 'sys:status',
                targetEntity: targetFile,
                riskLevel: lower.includes('shutdown') ? 'HIGH' : 'LOW',
                rationale: 'System management or inspection directive identified.',
            };
        }
        // 2. APPEND
        if (lower.includes('append') ||
            lower.includes('add to') ||
            lower.includes('attach to')) {
            return {
                intent: 'APPEND',
                confidence: 0.9,
                recommendedCapability: 'fs:append',
                targetEntity: targetFile,
                riskLevel: 'MEDIUM',
                rationale: 'Append operation requested.',
            };
        }
        // 3. WRITE
        if (lower.includes('create file') ||
            lower.includes('write file') ||
            lower.startsWith('write ') ||
            lower.startsWith('create ') ||
            (lower.includes('create') && (lower.includes('.txt') || lower.includes('.md') || lower.includes('.json')))) {
            return {
                intent: 'WRITE',
                confidence: 0.92,
                recommendedCapability: 'fs:write',
                targetEntity: targetFile,
                riskLevel: 'MEDIUM',
                rationale: 'File creation or overwrite operation identified.',
            };
        }
        // 4. UPDATE
        if (lower.includes('update file') ||
            lower.includes('modify file') ||
            lower.includes('replace in file') ||
            lower.startsWith('update ') ||
            lower.startsWith('modify ')) {
            return {
                intent: 'UPDATE',
                confidence: 0.88,
                recommendedCapability: 'fs:update',
                targetEntity: targetFile,
                riskLevel: 'MEDIUM',
                rationale: 'File modification operation identified.',
            };
        }
        // 5. READ
        if (lower.includes('read file') ||
            lower.includes('view file') ||
            lower.includes('show file') ||
            lower.includes('inspect file') ||
            lower.startsWith('read ') ||
            lower.startsWith('cat ') ||
            lower.includes('content of')) {
            return {
                intent: 'READ',
                confidence: 0.95,
                recommendedCapability: 'fs:read',
                targetEntity: targetFile,
                riskLevel: 'LOW',
                rationale: 'Read-only inspection operation requested.',
            };
        }
        // 6. SEARCH
        if (lower.includes('search') ||
            lower.includes('find') ||
            lower.includes('grep') ||
            lower.includes('locate') ||
            lower.includes('list files') ||
            lower.startsWith('ls') ||
            lower.startsWith('dir')) {
            return {
                intent: 'SEARCH',
                confidence: 0.9,
                recommendedCapability: 'fs:search',
                targetEntity: targetFile,
                riskLevel: 'LOW',
                rationale: 'Search or listing query identified.',
            };
        }
        // 7. OBSERVE
        if (lower.startsWith('observe') ||
            lower.includes('monitor') ||
            lower.includes('watch') ||
            lower.includes('check telemetry')) {
            return {
                intent: 'OBSERVE',
                confidence: 0.85,
                recommendedCapability: 'telemetry:read',
                targetEntity: targetFile,
                riskLevel: 'LOW',
                rationale: 'Telemetry or monitoring observation requested.',
            };
        }
        // 8. ANALYZE
        if (lower.includes('analyze') ||
            lower.includes('evaluate') ||
            lower.includes('assess') ||
            lower.includes('examine') ||
            lower.includes('compare')) {
            return {
                intent: 'ANALYZE',
                confidence: 0.85,
                recommendedCapability: 'cognitive:analyze',
                targetEntity: targetFile,
                riskLevel: 'LOW',
                rationale: 'Analytical reasoning request identified.',
            };
        }
        // 9. PLAN
        if (lower.startsWith('plan') ||
            lower.includes('create a plan') ||
            lower.includes('how to') ||
            lower.includes('propose steps') ||
            lower.includes('outline strategy')) {
            return {
                intent: 'PLAN',
                confidence: 0.88,
                recommendedCapability: 'cognitive:plan',
                targetEntity: targetFile,
                riskLevel: 'LOW',
                rationale: 'Planning request identified.',
            };
        }
        // 10. DECIDE
        if (lower.startsWith('decide') ||
            lower.includes('should i') ||
            lower.includes('make a decision') ||
            lower.includes('choose between')) {
            return {
                intent: 'DECIDE',
                confidence: 0.85,
                recommendedCapability: 'cognitive:decide',
                targetEntity: targetFile,
                riskLevel: 'LOW',
                rationale: 'Decision reasoning request identified.',
            };
        }
        // 11. COMMUNICATE
        if (lower.includes('echo') ||
            lower.includes('say') ||
            lower.includes('print') ||
            lower.includes('tell me') ||
            lower.includes('notify')) {
            return {
                intent: 'COMMUNICATE',
                confidence: 0.85,
                recommendedCapability: 'comm:echo',
                targetEntity: targetFile,
                riskLevel: 'LOW',
                rationale: 'Communication or echo request identified.',
            };
        }
        // 12. QUERY
        if (lower.startsWith('what') ||
            lower.startsWith('who') ||
            lower.startsWith('where') ||
            lower.startsWith('when') ||
            lower.startsWith('why') ||
            lower.endsWith('?') ||
            lower.includes('status of')) {
            return {
                intent: 'QUERY',
                confidence: 0.82,
                recommendedCapability: 'query:read',
                targetEntity: targetFile,
                riskLevel: 'LOW',
                rationale: 'Information query identified.',
            };
        }
        // 13. UNKNOWN (Fail safe)
        return {
            intent: 'UNKNOWN',
            confidence: 0.3,
            recommendedCapability: 'none',
            riskLevel: 'LOW',
            rationale: 'Intent could not be determined reliably from input. Safe default applied.',
        };
    }
}
