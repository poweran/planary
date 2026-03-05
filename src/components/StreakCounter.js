/**
 * Планарий — Streak Counter
 */

import { createElement } from '../utils/dom.js';
import { events as globalEvents, Events } from '../core/events.js';

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

                // Показываем подбадривающий тост
                const messages = [
                    "Так держать! 🔥",
                    "Огненная серия! 🚀",
                    "Не останавливайся! 💪",
                    "Твоя продуктивность на высоте! ⭐",
                    "Просто огонь! 🤩"
                ];
                const message = messages[Math.floor(Math.random() * messages.length)];
                globalEvents.emit(Events.TOAST, `Серия: ${count} дн. ${message}`);
            }
        },
        children: [
            createElement('span', { className: 'streak__icon', text: '🔥' }),
            createElement('span', { text: String(count) }),
        ],
    });
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
