export function pickNonEmptyString(...values: any[]): string {
    for (const value of values) {
        if (value === undefined || value === null) continue
        const text = String(value).trim()
        if (text.length > 0) return text
    }
    return ''
}

export function escapeHtmlText(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export function escapeHtmlAttr(value: unknown): string {
    return escapeHtmlText(value).replace(/`/g, '&#96;')
}
