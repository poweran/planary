/**
 * Планарий — Галерея достижений
 */

import { createElement } from '../utils/dom.js';
import { achievementService } from '../services/achievementService.js';

export class AchievementsView {
    constructor(containerEl) {
        this.container = containerEl;
    }

    async init() {
        await this.render();
    }

    async render() {
        this.container.innerHTML = '';

        const wrapper = createElement('div', { className: 'achievements-view' });

        // Заголовок
        wrapper.appendChild(createElement('h2', {
            className: 'achievements-view__title',
            text: '🏆 Достижения',
        }));

        const achievements = await achievementService.getAll();

        const grid = createElement('div', { className: 'achievements-grid' });

        for (const ach of achievements) {
            const card = createElement('div', {
                className: `achievement-card${ach.unlocked ? '' : ' achievement-card--locked'}`,
            });

            const icon = createElement('div', {
                className: 'achievement-card__icon',
                text: ach.icon,
            });

            const info = createElement('div', { className: 'achievement-card__info' });

            info.appendChild(createElement('div', {
                className: 'achievement-card__title',
                text: ach.title,
            }));

            info.appendChild(createElement('div', {
                className: 'achievement-card__desc',
                text: ach.description,
            }));

            if (ach.unlocked && ach.unlockedAt) {
                info.appendChild(createElement('div', {
                    className: 'achievement-card__date',
                    text: new Date(ach.unlockedAt).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    }),
                }));
            }

            card.appendChild(icon);
            card.appendChild(info);
            grid.appendChild(card);
        }

        wrapper.appendChild(grid);
        this.container.appendChild(wrapper);
    }
}
