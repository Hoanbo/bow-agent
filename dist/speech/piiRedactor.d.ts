export interface PiiRedactionResult {
    redactedText: string;
    detectedTypes: string[];
}
/**
 * EN: Redacts sensitive PII from speech transcript text.
 * VI: Che các thông tin nhạy cảm (PII) khỏi văn bản phiên âm giọng nói.
 *
 * @param text Văn bản cần kiểm tra và che thông tin nhạy cảm.
 * @returns Object chứa `redactedText` (đã che) và `detectedTypes` (danh sách loại PII phát hiện được).
 */
export declare function redactPii(text: string): PiiRedactionResult;
