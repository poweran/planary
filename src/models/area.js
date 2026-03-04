/**
 * Планарий — Модель области планирования
 */

export const DEFAULT_AREAS = [
    { id: 'today', title: 'Сегодня', icon: '📅', flexGrow: 1, order: 0 },
    { id: 'tomorrow', title: 'Завтра', icon: '📋', flexGrow: 1, order: 1 },
    { id: 'chaos', title: 'Хаос', icon: '🌀', flexGrow: 1, order: 2 },
    { id: 'future', title: 'На будущее', icon: '📦', flexGrow: 1, order: 3 },
];

export function getAreaById(areas, id) {
    return areas.find(a => a.id === id) || DEFAULT_AREAS.find(a => a.id === id);
}
