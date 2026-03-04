/**
 * Планарий — Streak Counter (заготовка)
 */

import { createElement } from '../utils/dom.js';

export function renderStreak(count) {
    if (count <= 0) return null;

    return createElement('div', {
        className: 'streak',
        children: [
            createElement('span', { className: 'streak__icon', text: '🔥' }),
            createElement('span', { text: String(count) }),
        ],
    });
}
