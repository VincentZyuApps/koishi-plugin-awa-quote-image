export function formatTimestamp(timezoneOffset: number): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    if (timezoneOffset < -12 || timezoneOffset > 14) {
        return now.toLocaleString('zh-CN', options);
    }
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const local = new Date(utc + timezoneOffset * 3600000);
    return local.toLocaleString('zh-CN', options);
}
