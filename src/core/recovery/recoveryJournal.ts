// src/core/recovery/recoveryJournal.ts
// BOWCON V4.0 — MILESTONE 1.3.16: RECOVERY JOURNAL
//
// EN:
// Authoritative append-only recovery journal scoped per ${userId}::${sessionId}.
// Preserves immutable chronological records of recovery inspection, reconstruction, and decisions.
//
// VI:
// Nhật ký phục hồi chỉ-nối-thêm có thẩm quyền được phân phạm vi theo ${userId}::${sessionId}.
// Lưu giữ các bản ghi theo trình tự thời gian bất biến về việc kiểm tra, tái thiết lập và quyết định phục hồi.

import type {
  RecoveryJournalRecord,
  RecoveryJournalEventType,
  RecoveryState,
} from './recoveryTypes.js';
import { computeRecoveryJournalFingerprint } from './recoveryFingerprint.js';

/**
 * EN: Deep freezes an object recursively.
 * VI: Đóng băng sâu một đối tượng một cách đệ quy.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

/**
 * EN: In-memory scoped append-only recovery journal.
 * VI: Nhật ký phục hồi chỉ-nối-thêm trong bộ nhớ có phân phạm vi.
 */
export class RecoveryJournal {
  private readonly userId: string;
  private readonly sessionId: string;
  private readonly records: RecoveryJournalRecord[] = [];
  private sequenceCounter = 0;

  constructor(userId: string, sessionId: string) {
    this.userId = userId;
    this.sessionId = sessionId;
  }

  /**
   * EN: Records a new recovery event into the append-only journal.
   * VI: Ghi lại một sự kiện phục hồi mới vào nhật ký chỉ-nối-thêm.
   */
  public record(
    recoveryId: string,
    eventType: RecoveryJournalEventType,
    state: RecoveryState,
    details?: Readonly<Record<string, unknown>>,
  ): RecoveryJournalRecord {
    this.sequenceCounter++;
    const sequence = this.sequenceCounter;
    const eventId = `rec_evt_${recoveryId}_${sequence}`;
    const fingerprint = computeRecoveryJournalFingerprint(recoveryId, eventType, sequence, state);

    const record: RecoveryJournalRecord = deepFreeze({
      eventId,
      recoveryId,
      userId: this.userId,
      sessionId: this.sessionId,
      eventType,
      timestamp: Date.now(),
      state,
      fingerprint,
      details: details ? deepFreeze({ ...details }) : undefined,
    });

    this.records.push(record);
    return record;
  }

  /**
   * EN: Returns an immutable snapshot of all recorded journal events.
   * VI: Trả về một snapshot bất biến của tất cả các sự kiện nhật ký đã ghi.
   */
  public getEvents(): readonly RecoveryJournalRecord[] {
    return Object.freeze([...this.records]);
  }

  /**
   * EN: Returns the number of events currently in the journal.
   * VI: Trả về số lượng sự kiện hiện có trong nhật ký.
   */
  public getCount(): number {
    return this.records.length;
  }
}
