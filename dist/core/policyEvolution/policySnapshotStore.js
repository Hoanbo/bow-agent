// src/core/policyEvolution/policySnapshotStore.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Durable, tenant-partitioned historical policy snapshot and evolution store.
// Encapsulates crash-safe atomic persistence via DurableJsonStore and strict isolation via UserPartitionResolver.
// Enforces secret sanitization via DiagnosisSanitizer and bounded query safety.
// Kho lưu trữ bản chụp và tiến hóa chính sách bền vững, được phân vùng theo người thuê.
// Đóng gói lưu trữ nguyên tử an toàn lỗi qua DurableJsonStore và cô lập nghiêm ngặt qua UserPartitionResolver.
// Thực thi làm sạch bí mật qua DiagnosisSanitizer và truy vấn an toàn có giới hạn.
import path from 'node:path';
import crypto from 'node:crypto';
import { DurableJsonStore } from '../persistence/durableJsonStore.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { createPolicySnapshotId, createEvolutionVersionId, } from './policyEvolutionTypes.js';
export const DEFAULT_BASELINE_CLASSIFICATIONS = Object.freeze({
    get_sales_report: 'OBSERVE',
    get_profit_margin_report: 'OBSERVE',
    get_inventory_health: 'OBSERVE',
    get_pending_fulfillment_queue: 'OBSERVE',
    inspect_screen_notifications: 'OBSERVE',
    desktop_capture_screenshot: 'OBSERVE',
    get_user_wallet: 'OBSERVE',
    get_user_orders: 'OBSERVE',
    search_products: 'OBSERVE',
    get_product_detail: 'OBSERVE',
    get_warranty_policy: 'OBSERVE',
    boss_recall_memory: 'OBSERVE',
    get_morning_briefing: 'OBSERVE',
    inspect_order_dispute: 'RECOMMEND',
    evaluate_restock_needs: 'RECOMMEND',
    recommend_voucher_campaign: 'RECOMMEND',
    boss_remember_fact: 'REVERSIBLE',
    teach_boss_rule: 'REVERSIBLE',
    desktop_smarthome_control: 'REVERSIBLE',
    desktop_launch_app: 'REVERSIBLE',
    desktop_send_keys: 'REVERSIBLE',
    desktop_mouse_action: 'REVERSIBLE',
    robot_aim_head: 'REVERSIBLE',
    robot_track_sound_source: 'REVERSIBLE',
    send_telegram_briefing_to_boss: 'REVERSIBLE',
    fulfill_order_handover: 'HIGH_IMPACT',
    manage_shop_vouchers: 'HIGH_IMPACT',
    desktop_reply_message: 'HIGH_IMPACT',
    desktop_execute_code: 'HIGH_IMPACT',
    delegate_subagent_task: 'HIGH_IMPACT',
    transfer_funds: 'FORBIDDEN',
    delete_database: 'FORBIDDEN',
    bypass_robot_interlocks: 'FORBIDDEN',
    execute_untrusted_host_script: 'FORBIDDEN',
});
/**
 * Initial baseline factory generating nominal system policy configuration.
 * Nhà máy đường cơ sở ban đầu tạo cấu hình chính sách hệ thống danh nghĩa.
 */
export function createBaselinePolicyConfiguration() {
    const versionId = createEvolutionVersionId('v1.0.0_baseline');
    const guardrails = {
        minApprovalTimeoutMs: 30000,
        maxRetries: 3,
        errorBudgetThreshold: 0.05,
        canaryObservationWindowMinutes: 15,
        allowAutonomousDegradation: false,
    };
    const payload = JSON.stringify({ versionId, classifications: DEFAULT_BASELINE_CLASSIFICATIONS, guardrails });
    const checksum = crypto.createHash('sha256').update(payload).digest('hex');
    return {
        versionId,
        actionClassifications: DEFAULT_BASELINE_CLASSIFICATIONS,
        guardrails: Object.freeze(guardrails),
        activeSince: Date.now(),
        checksum,
    };
}
/**
 * Schema validator for durable policy storage records.
 * Hàm xác thực lược đồ cho bản ghi lưu trữ chính sách bền vững.
 */
function validatePolicyStoreRecord(data) {
    if (!data || typeof data !== 'object') {
        return { success: false, errors: ['Expected object for PolicyStoreRecord'] };
    }
    const record = data;
    if (!record.activeSnapshot || typeof record.activeSnapshot !== 'object') {
        return { success: false, errors: ['Missing activeSnapshot in PolicyStoreRecord'] };
    }
    if (!Array.isArray(record.history)) {
        return { success: false, errors: ['Expected array for policy history'] };
    }
    return { success: true, data: data };
}
export class PolicySnapshotStore {
    baseDir;
    sanitizer;
    stores = new Map();
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'policy-evolution'));
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * Resolves the isolated DurableJsonStore for the authenticated user partition.
     * Never bypasses UserPartitionResolver.
     * Giải quyết DurableJsonStore cô lập cho phân vùng người dùng đã xác thực.
     */
    getStore(userId) {
        const effectiveUserId = userId ?? DEFAULT_PRIMARY_USER_ID;
        const partition = resolveUserPartition(effectiveUserId, this.baseDir);
        let store = this.stores.get(partition.partitionKey);
        if (!store) {
            const partitionDir = path.resolve(this.baseDir, partition.partitionKey);
            const policyFilePath = path.resolve(partitionDir, 'policies.json');
            store = new DurableJsonStore({
                filePath: policyFilePath,
                validator: validatePolicyStoreRecord,
                defaultFactory: () => {
                    const baselineConfig = createBaselinePolicyConfiguration();
                    const initialSnapshot = {
                        snapshotId: createPolicySnapshotId(`snap_${Date.now()}_baseline`),
                        configuration: baselineConfig,
                        userPartition: partition.partitionKey,
                        createdAt: Date.now(),
                    };
                    return {
                        activeSnapshot: Object.freeze(initialSnapshot),
                        history: Object.freeze([initialSnapshot]),
                    };
                },
                allowedBaseDir: this.baseDir,
                quarantineCorrupted: true,
            });
            this.stores.set(partition.partitionKey, store);
        }
        return { store, partitionKey: partition.partitionKey };
    }
    /**
     * Retrieves the currently active policy configuration for a user partition.
     * Lấy cấu hình chính sách hiện đang hoạt động cho một phân vùng người dùng.
     */
    getActiveConfiguration(userId) {
        const { store } = this.getStore(userId);
        const data = store.read();
        return data.activeSnapshot.configuration;
    }
    /**
     * Retrieves the currently active snapshot object.
     * Lấy đối tượng bản chụp hiện đang hoạt động.
     */
    getActiveSnapshot(userId) {
        const { store } = this.getStore(userId);
        return store.read().activeSnapshot;
    }
    /**
     * Creates and atomically commits a new policy configuration snapshot.
     * Moves existing active snapshot to historical version log.
     * Tạo và ghi nguyên tử một bản chụp cấu hình chính sách mới.
     * Chuyển bản chụp đang hoạt động hiện tại vào nhật ký phiên bản lịch sử.
     */
    commitSnapshot(newConfig, userId) {
        const { store, partitionKey } = this.getStore(userId);
        const sanitizedConfig = this.sanitizer.sanitize(newConfig);
        const snapshotId = createPolicySnapshotId(`snap_${Date.now()}_${newConfig.versionId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 16)}`);
        const newSnapshot = {
            snapshotId,
            configuration: Object.freeze(sanitizedConfig),
            userPartition: partitionKey,
            createdAt: Date.now(),
        };
        const currentData = store.read();
        const updatedHistory = [...currentData.history, currentData.activeSnapshot];
        store.write({
            activeSnapshot: Object.freeze(newSnapshot),
            history: Object.freeze(updatedHistory),
        });
        return newSnapshot;
    }
    /**
     * Rolls back the active policy configuration to a specific historical snapshot.
     * Hoàn tác cấu hình chính sách đang hoạt động về một bản chụp lịch sử cụ thể.
     */
    rollbackToSnapshot(targetSnapshotId, userId) {
        const { store } = this.getStore(userId);
        const currentData = store.read();
        const target = currentData.history.find((s) => s.snapshotId === targetSnapshotId);
        if (!target) {
            throw new Error(`ROLLBACK_FAILED: Snapshot ${targetSnapshotId} not found in historical versions.`);
        }
        const updatedHistory = [...currentData.history, currentData.activeSnapshot];
        store.write({
            activeSnapshot: target,
            history: Object.freeze(updatedHistory),
        });
        return target;
    }
    /**
     * Bounded query for historical policy snapshots with pagination.
     * Truy vấn có giới hạn cho các bản chụp chính sách lịch sử với phân trang.
     */
    queryHistoricalSnapshots(options, userId) {
        const { store } = this.getStore(userId);
        const currentData = store.read();
        const all = currentData.history;
        const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));
        let startIndex = 0;
        if (options?.cursor) {
            try {
                const decoded = Buffer.from(options.cursor, 'base64').toString('utf8');
                const parsed = parseInt(decoded, 10);
                if (!isNaN(parsed) && parsed >= 0) {
                    startIndex = parsed;
                }
            }
            catch {
                startIndex = 0;
            }
        }
        const pagedSlice = all.slice(startIndex, startIndex + limit);
        const nextIndex = startIndex + pagedSlice.length;
        const isTruncated = nextIndex < all.length;
        const nextCursor = isTruncated ? Buffer.from(String(nextIndex), 'utf8').toString('base64') : undefined;
        return {
            snapshots: Object.freeze(pagedSlice),
            nextCursor,
            totalMatching: all.length,
        };
    }
}
