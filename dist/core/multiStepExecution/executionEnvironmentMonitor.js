// src/core/multiStepExecution/executionEnvironmentMonitor.ts
// BOWCON V4.0 — MS-1.5.10: EXECUTION ENVIRONMENT MONITOR
// Component 1072 — REAL
//
// EN: Read-only environmental verification oracle. Evaluates declared preconditions
//     against observed system/visual state snapshots, detecting drift, invalidations,
//     and unknown anomalies. Strictly read-only: ZERO actuators, ZERO DOM, ZERO mouse/keyboard.
// VI: Bộ giám sát xác minh môi trường chỉ đọc. Đánh giá các điều kiện tiên quyết đã khai báo
//     so với các ảnh chụp trạng thái trực quan/hệ thống quan sát được, phát hiện sự trôi dạt,
//     vô hiệu hóa và bất thường không xác định. Hoàn toàn chỉ đọc: KHÔNG truyền động, KHÔNG DOM, KHÔNG chuột/phím.
import crypto from 'node:crypto';
import { computeEnvironmentSnapshotProvenanceHash, } from './multiStepExecutionTypes.js';
import { MultiStepExecutionValidator } from './multiStepExecutionValidator.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class ExecutionEnvironmentMonitor {
    userStopProvider;
    constructor(options) {
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * EN: Captures an immutable, cryptographically sealed environment snapshot.
     * VI: Ghi lại một ảnh chụp môi trường bất biến, được niêm phong mật mã.
     */
    captureSnapshot(params) {
        const timestamp = new Date().toISOString();
        const snapshotId = `env_${params.tenantId}_${params.sessionId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const rawSnapshot = {
            snapshotId,
            tenantId: params.tenantId,
            sessionId: params.sessionId,
            generationId: params.generationId,
            stepId: params.stepId,
            screenStateHash: params.screenStateHash,
            observedElements: params.observedElements,
            systemPreconditions: Object.freeze({ ...params.systemPreconditions }),
            observedPreconditions: Object.freeze({ ...params.observedPreconditions }),
            timestamp,
        };
        const provenanceHash = computeEnvironmentSnapshotProvenanceHash(rawSnapshot);
        const sealedSnapshot = Object.freeze({
            ...rawSnapshot,
            provenanceHash,
        });
        MultiStepExecutionValidator.validateEnvironmentSnapshot(sealedSnapshot);
        return sealedSnapshot;
    }
    /**
     * EN: Compares observed environment snapshot against expected preconditions and classifies validity.
     * VI: So sánh ảnh chụp môi trường quan sát được với các điều kiện tiên quyết dự kiến và phân loại tính hợp lệ.
     */
    verifyEnvironmentState(snapshot, expectedPreconditions) {
        MultiStepExecutionValidator.validateEnvironmentSnapshot(snapshot);
        const drifted = [];
        let hasInvalid = false;
        let hasUnknown = false;
        // Evaluate each expected condition
        for (const [key, expectedVal] of Object.entries(expectedPreconditions)) {
            if (!(key in snapshot.observedPreconditions)) {
                // Missing key in observed environment: Fail closed as UNKNOWN
                hasUnknown = true;
                drifted.push(key);
                continue;
            }
            const observedVal = snapshot.observedPreconditions[key];
            if (observedVal === undefined || observedVal === null || observedVal === 'UNKNOWN') {
                hasUnknown = true;
                drifted.push(key);
            }
            else if (observedVal !== expectedVal) {
                hasInvalid = true;
                drifted.push(key);
            }
        }
        // Classify
        if (hasUnknown) {
            return {
                validity: 'UNKNOWN',
                reason: `Environmental state contains unknown/unverified parameters: [${drifted.join(', ')}]`,
                driftedPreconditions: drifted,
                snapshot,
            };
        }
        if (hasInvalid) {
            return {
                validity: 'INVALID',
                reason: `Environmental preconditions invalidated: [${drifted.join(', ')}]`,
                driftedPreconditions: drifted,
                snapshot,
            };
        }
        // Check if observed has extra keys that differ from system preconditions (Drift detection)
        let isChanged = false;
        for (const [key, val] of Object.entries(snapshot.observedPreconditions)) {
            if (key in snapshot.systemPreconditions && snapshot.systemPreconditions[key] !== val) {
                isChanged = true;
                if (!drifted.includes(key)) {
                    drifted.push(key);
                }
            }
        }
        if (isChanged) {
            return {
                validity: 'CHANGED',
                reason: `Environmental state changed from system baseline without invalidating expected conditions: [${drifted.join(', ')}]`,
                driftedPreconditions: drifted,
                snapshot,
            };
        }
        return {
            validity: 'UNCHANGED',
            reason: 'Environmental state strictly matches expected preconditions and baseline',
            driftedPreconditions: [],
            snapshot,
        };
    }
}
