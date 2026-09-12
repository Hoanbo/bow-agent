import { type CrossIncidentProvenanceRecord } from './crossIncidentTypes.js';
export interface GenerateProvenanceInput {
    readonly reportId: string;
    readonly clusterHash: string;
    readonly constituentPostMortemHashes: readonly string[];
    readonly timestamp?: number;
}
export declare class CrossIncidentProvenanceEngine {
    /**
     * Computes the deterministic SHA-256 hash over reportId, clusterHash, sorted hashes, and timestamp.
     * SHA-256(reportId || clusterHash || sorted(constituentPostMortemHashes) || timestamp).
     * Tính toán băm SHA-256 xác định qua reportId, clusterHash, các băm đã sắp xếp và timestamp.
     */
    computeProvenanceHash(reportId: string, clusterHash: string, sortedConstituentHashes: readonly string[], timestamp: number): string;
    /**
     * Generates a tamper-evident cryptographic provenance record.
     * Constituent post-mortem hashes are deterministically sorted lexicographically.
     * Tạo bản ghi nguồn gốc mật mã chống can thiệp.
     * Các băm hậu kiểm cấu thành được sắp xếp xác định theo thứ tự từ điển.
     */
    generateProvenance(input: GenerateProvenanceInput): CrossIncidentProvenanceRecord;
    /**
     * Verifies the cryptographic integrity of a provenance record against constituent hashes.
     * Returns true only if the recalculated SHA-256 matches exactly.
     * Xác minh tính toàn vẹn mật mã của bản ghi nguồn gốc so với các băm cấu thành.
     * Chỉ trả về true nếu SHA-256 tính toán lại khớp chính xác.
     */
    verifyProvenance(record: CrossIncidentProvenanceRecord, actualConstituentHashes: readonly string[]): boolean;
}
