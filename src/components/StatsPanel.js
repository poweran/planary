/**
 * Планарий — Панель статистики (тепловая карта + счётчики)
 */

import { createElement } from '../utils/dom.js';
import { archiveService } from '../services/archiveService.js';

export async function renderStatsPanel() {
    const panel = createElement('div', { className: 'stats-panel' });

    const [stats, heatmap, streak] = await Promise.all([
        archiveService.getStats(),
        archiveService.getHeatmap(90),
        archiveService.getStreakDays(),
    ]);

    // Счётчики
    const counters = createElement('div', { className: 'stats-panel__counters' });

    const items = [
        { label: 'Сегодня', value: stats.today, icon: '☀️' },
        { label: 'Неделя', value: stats.week, icon: '📅' },
        { label: 'Месяц', value: stats.month, icon: '📊' },
        { label: 'Всего', value: stats.total, icon: '🏆' },
        { label: 'Streak', value: `${streak} 🔥`, icon: '' },
    ];

    for (const item of items) {
        const counter = createElement('div', { className: 'stats-counter' });
        counter.innerHTML = `
            <div class="stats-counter__value">${item.icon ? item.icon + ' ' : ''}${item.value}</div>
            <div class="stats-counter__label">${item.label}</div>
        `;
        counters.appendChild(counter);
    }

    panel.appendChild(counters);

    // Тепловая карта
    const heatmapEl = createElement('div', { className: 'stats-heatmap' });
    const maxCount = Math.max(1, ...heatmap.map(d => d.count));

    for (const day of heatmap) {
        const cell = createElement('div', {
            className: 'stats-heatmap__cell',
            attrs: { title: `${day.date}: ${day.count} задач` },
        });

        if (day.count === 0) {
            cell.style.opacity = '0.1';
        } else {
            const intensity = Math.min(1, day.count / maxCount);
            cell.style.opacity = String(0.2 + intensity * 0.8);
        }

        heatmapEl.appendChild(cell);
    }

    panel.appendChild(createElement('div', {
        className: 'stats-heatmap__title',
        text: 'Активность за 90 дней',
    }));
    panel.appendChild(heatmapEl);

    return panel;
}
