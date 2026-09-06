const add = (items, type, value, source, confidence = 0.9) => {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue && !items.some(item => item.type === type && item.normalizedValue === normalizedValue)) {
        items.push({ type, value: value.trim(), normalizedValue, source, confidence });
    }
};
// EN: Extract only explicit deterministic entities; contextual references are handled separately.
// VI: Chỉ trích xuất entity xác định, rõ ràng; tham chiếu theo context được xử lý riêng.
export function extractEntities(text) {
    const entities = [];
    for (const match of text.matchAll(/(?:order|đơn(?:\s*hàng)?)\s*#?([A-Za-z0-9_-]+)/giu))
        add(entities, 'order', match[1], match[0]);
    for (const match of text.matchAll(/#([A-Za-z0-9_-]{2,})/g))
        add(entities, 'identifier', match[1], match[0]);
    for (const match of text.matchAll(/(?:file|tệp|file)\s+([\w.-]+)/giu))
        add(entities, 'file', match[1], match[0]);
    for (const match of text.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(USD|VND|đ|₫|%)/giu)) {
        add(entities, 'amount', match[1].replace(',', '.'), match[0]);
        add(entities, 'currency', match[2], match[0]);
    }
    if (/\bvoice\b|giọng/iu.test(text))
        add(entities, 'setting', 'voice', 'voice');
    if (/\bviệt|vi-vn/iu.test(text))
        add(entities, 'setting', 'language', 'Vietnamese');
    if (/\benglish|tiếng anh|en-us/iu.test(text))
        add(entities, 'setting', 'language', 'English');
    return entities;
}
