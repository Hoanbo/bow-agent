import type { RecoveryJournalRecord, RecoveryJournalEventType, RecoveryState } from './recoveryTypes.js';
/**
 * EN: In-memory scoped append-only recovery journal.
 * VI: Nhật ký phục hồi chỉ-nối-thêm trong bộ nhớ có phân phạm vi.
 */
export declare class RecoveryJournal {
    private readonly userId;
    private readonly sessionId;
    private readonly records;
    private sequenceCounter;
    constructor(userId: string, sessionId: string);
    /**
     * EN: Records a new recovery event into the append-only journal.
     * VI: Ghi lại một sự kiện phục hồi mới vào nhật ký chỉ-nối-thêm.
     */
    record(recoveryId: string, eventType: RecoveryJournalEventType, state: RecoveryState, details?: Readonly<Record<string, unknown>>): RecoveryJournalRecord;
    /**
     * EN: Returns an immutable snapshot of all recorded journal events.
     * VI: Trả về một snapshot bất biến của tất cả các sự kiện nhật ký đã ghi.
     */
    getEvents(): readonly RecoveryJournalRecord[];
    /**
     * EN: Returns the number of events currently in the journal.
     * VI: Trả về số lượng sự kiện hiện có trong nhật ký.
     */
    getCount(): number;
}
