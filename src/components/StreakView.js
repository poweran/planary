/**
 * Планарий — Обзор серии и статистики за дни
 */

import { createElement } from '../utils/dom.js';
import { archiveService } from '../services/archiveService.js';

export class StreakView {
    constructor(containerEl) {
        this.container = containerEl;
    }

    async init() {
        await this.render();
    }

    async render() {
        this.container.innerHTML = '';

        const wrapper = createElement('div', { className: 'streak-view' });

        // Заголовок
        wrapper.appendChild(createElement('h2', {
            className: 'streak-view__title',
            text: '🔥 Статистика активности',
        }));

        const dailyCounts = await archiveService.getDailyTaskCounts();

        const list = createElement('div', { className: 'streak-list' });

        if (dailyCounts.length === 0) {
            const emptyState = createElement('div', {
                className: 'streak-empty',
                text: 'Здесь пока нет данных. Заверши пару задач, чтобы разжечь свое пламя! 🔥',
            });
            list.appendChild(emptyState);
        } else {
            for (const item of dailyCounts) {
                const dayCard = createElement('div', { className: 'streak-day' });

                const fireIconContainer = createElement('div', { className: 'streak-day__fire' });

                const fireBg = createElement('div', { className: 'streak-day__fire-bg', text: '🔥' });
                const countText = createElement('div', { className: 'streak-day__count', text: String(item.count) });

                fireIconContainer.appendChild(fireBg);
                fireIconContainer.appendChild(countText);

                const info = createElement('div', { className: 'streak-day__info' });

                // Форматируем дату красиво
                const [year, month, day] = item.date.split('-');
                const d = new Date(year, month - 1, day);
                const formatter = new Intl.DateTimeFormat('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    weekday: 'short'
                });

                const dateLabel = createElement('div', {
                    className: 'streak-day__date',
                    text: formatter.format(d)
                });

                const taskLabelText = item.count === 1 ? 'задача' : (item.count > 1 && item.count < 5 ? 'задачи' : 'задач');
                const taskLabel = createElement('div', {
                    className: 'streak-day__label',
                    text: `${item.count} выполненная ${taskLabelText}`
                });

                info.appendChild(dateLabel);
                info.appendChild(taskLabel);

                dayCard.appendChild(fireIconContainer);
                dayCard.appendChild(info);

                list.appendChild(dayCard);
            }
        }

        wrapper.appendChild(list);
        this.container.appendChild(wrapper);
    }
}
