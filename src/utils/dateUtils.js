/**
 * Планарий — Утилиты для дат
 */

/**
 * Начало дня (00:00)
 */
export function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Сегодня ли этот день?
 */
export function isToday(date) {
    return startOfDay(date).getTime() === startOfDay().getTime();
}

/**
 * Был ли вчера?
 */
export function isYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return startOfDay(date).getTime() === startOfDay(yesterday).getTime();
}

/**
 * Миллисекунд до полуночи
 */
export function msUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime() - now.getTime();
}

/**
 * Форматирование даты
 */
export function formatDate(date) {
    if (isToday(date)) return 'Сегодня';
    if (isYesterday(date)) return 'Вчера';

    const d = new Date(date);
    const months = [
        'янв', 'фев', 'мар', 'апр', 'май', 'июн',
        'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

/**
 * Ключ даты для хранения (YYYY-MM-DD)
 */
export function dateKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
