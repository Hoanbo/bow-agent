import type { IncidentId } from '../diagnosis/diagnosisTypes.js';
import type { IncidentClosureRecord, PostMortemReport, IncidentResilienceProvenanceRecord } from './incidentResilienceTypes.js';
export interface BuildResilienceProvenanceOptions {
    readonly incidentId: IncidentId;
    readonly closureRecord: IncidentClosureRecord;
    readonly postMortemReport: PostMortemReport;
    readonly upstreamRemediationHash?: string;
}
export declare class IncidentResilienceProvenanceEngine {
    /**
     * Builds an immutable cryptographic provenance record for the resilience lifecycle.
     * Xây dựng bản ghi nguồn gốc mật mã bất biến cho vòng đời phục hồi sự cố.
     */
    buildProvenance(options: BuildResilienceProvenanceOptions): IncidentResilienceProvenanceRecord;
    /**
     * Verifies the cryptographic integrity of an IncidentResilienceProvenanceRecord.
     * Xác minh tính toàn vẹn mật mã của IncidentResilienceProvenanceRecord.
     */
    verifyProvenance(record: IncidentResilienceProvenanceRecord): boolean;
}
