/**
 * Планарий — Streak Counter
 */

import { createElement } from '../utils/dom.js';
import { events as globalEvents, Events } from '../core/events.js';
import { archiveService } from '../services/archiveService.js';

export function renderStreak(count) {
    if (count <= 0) return null;

    const streakLink = createElement('a', {
        className: 'header__nav-link streak-header-link',
        attrs: { href: '#/streak', title: `Огненная серия: ${count} дн. 🔥` },
        children: [
            createElement('span', { className: 'header__nav-icon', text: `🔥${count}` }),
            createElement('span', { className: 'header__nav-label', text: 'Серия' }),
        ],
    });

    streakLink.addEventListener('click', (e) => {
        // Создаем искры
        createSparks(e.clientX, e.clientY);

        // Подбадривание
        const messages = [
            "Так держать! 🔥",
            "Огненная серия! 🚀",
            "Не останавливайся! 💪"
        ];
        globalEvents.emit(Events.TOAST, messages[Math.floor(Math.random() * messages.length)]);

        if (window.location.hash === '#/streak') {
            e.preventDefault();
            window.location.hash = '#/';
        }
    });

    return streakLink;
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
