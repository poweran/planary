/**
 * Планарий — Галерея достижений
 */

import { createElement } from '../utils/dom.js';
import { achievementService } from '../services/achievementService.js';
import { events, Events } from '../core/events.js';

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

            // Кнопка «Поделиться»
            if (ach.unlocked) {
                const shareBtn = createElement('button', {
                    className: 'btn btn--ghost btn--small achievement-card__share',
                    attrs: { title: 'Поделиться' },
                    text: '📤',
                });
                shareBtn.addEventListener('click', async () => {
                    const text = `🦎 Планарий: Я получил достижение «${ach.title}» ${ach.icon}!`;
                    if (navigator.share) {
                        try {
                            await navigator.share({ text });
                        } catch (e) {
                            // Пользователь отменил
                        }
                    } else {
                        await navigator.clipboard.writeText(text);
                        events.emit(Events.TOAST, '📋 Скопировано в буфер обмена!');
                    }
                });
                card.appendChild(shareBtn);
            }

            card.appendChild(icon);
            card.appendChild(info);
            grid.appendChild(card);
        }

        wrapper.appendChild(grid);
        this.container.appendChild(wrapper);
    }
}
