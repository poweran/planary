/**
 * Планарий — Streak Counter
 */

import { createElement } from '../utils/dom.js';
import { events as globalEvents, Events } from '../core/events.js';
import { archiveService } from '../services/archiveService.js';

export function renderStreak(count) {
    if (count <= 0) return null;

    return createElement('div', {
        className: 'streak',
        title: `Твоя огненная серия: ${count} дней подряд! 🔥`,
        events: {
            click: (e) => {
                const el = e.currentTarget;

                // Анимация при клике
                el.classList.add('streak--bump');
                setTimeout(() => el.classList.remove('streak--bump'), 300);

                // Создаем искры
                createSparks(e.clientX, e.clientY);

                // Поддержка
                const messages = [
                    "Так держать! 🔥",
                    "Огненная серия! 🚀",
                    "Не останавливайся! 💪"
                ];
                globalEvents.emit(Events.TOAST, messages[Math.floor(Math.random() * messages.length)]);

                // Открываем модалку с деталями
                showStreakModal(count);
            }
        },
        children: [
            createElement('span', { className: 'streak__icon', text: '🔥' }),
            createElement('span', { text: String(count) }),
        ],
    });
}

async function showStreakModal(currentCount) {
    const old = document.querySelector('.streak-modal-overlay');
    if (old) old.remove();

    const overlay = createElement('div', { className: 'streak-modal-overlay' });

    // Прелоадер
    const modal = createElement('div', {
        className: 'streak-modal',
        html: '<div style="padding: 24px; text-align: center; color: var(--color-text-secondary);">Загрузка статистики... 🔥</div>'
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeOverlay = (e) => {
        if (e && e.target !== overlay && !e.target.closest('.streak-close-btn')) return;
        overlay.remove();
    };
    overlay.addEventListener('click', closeOverlay);

    try {
        const stats = await archiveService.getStreakStats();

        while (modal.firstChild) {
            modal.removeChild(modal.firstChild);
        }

        const header = createElement('div', { className: 'streak-modal__header' });
        header.appendChild(createElement('h2', { text: 'Твоя продуктивность 🔥' }));
        const closeBtn = createElement('button', {
            className: 'streak-close-btn',
            text: '✕',
            events: { click: closeOverlay }
        });
        header.appendChild(closeBtn);
        modal.appendChild(header);

        const body = createElement('div', { className: 'streak-modal__body' });

        const items = [
            { label: 'Текущая серия', value: `${stats.currentStreak} дн.`, icon: '🔥' },
            { label: 'Рекордная серия', value: `${stats.bestStreak} дн.`, icon: '🏆' },
            { label: 'Активных дней', value: `${stats.totalActiveDays} дн.`, icon: '🗓️' },
            { label: 'Всего задач', value: stats.totalTasks, icon: '✅' }
        ];

        for (const item of items) {
            const statEl = createElement('div', { className: 'streak-stat-item' });
            statEl.innerHTML = `
                <div class="streak-stat-item__icon">${item.icon}</div>
                <div class="streak-stat-item__content">
                    <div class="streak-stat-item__label">${item.label}</div>
                    <div class="streak-stat-item__value">${item.value}</div>
                </div>
            `;
            body.appendChild(statEl);
        }

        modal.appendChild(body);

        if (stats.currentStreak >= stats.bestStreak && stats.bestStreak > 0) {
            const msg = createElement('div', {
                className: 'streak-modal__message',
                text: 'Умопомрачительно! Это твой личный рекорд. 🎉'
            });
            modal.appendChild(msg);
        }
    } catch (err) {
        modal.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--color-danger);">Ой, ошибка загрузки статистики</div>';
    }
}

function createSparks(x, y) {
    for (let i = 0; i < 6; i++) {
        const spark = document.createElement('div');
        spark.className = 'streak-spark';
        spark.textContent = ['✨', '🔥', '⭐'][Math.floor(Math.random() * 3)];

        const tx = (Math.random() - 0.5) * 80;
        const ty = (Math.random() - 1) * 80;

        spark.style.left = `${x}px`;
        spark.style.top = `${y}px`;
        spark.style.setProperty('--tx', `${tx}px`);
        spark.style.setProperty('--ty', `${ty}px`);

        document.body.appendChild(spark);

        setTimeout(() => {
            if (spark.parentNode) spark.remove();
        }, 800);
    }
}
