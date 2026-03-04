/**
 * Планарий — Система тостов (уведомлений)
 */

import { createElement } from '../utils/dom.js';
import { events, Events } from '../core/events.js';

let activeToast = null;

export function initToasts() {
    events.on(Events.TOAST, (message) => {
        showToast(message);
    });
}

export function showToast(message, duration = 3000) {
    // Убираем предыдущий тост
    if (activeToast) {
        activeToast.remove();
    }

    const toast = createElement('div', {
        className: 'toast',
        text: message,
    });

    document.body.appendChild(toast);
    activeToast = toast;

    setTimeout(() => {
        toast.classList.add('toast--leaving');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
            if (activeToast === toast) activeToast = null;
        }, 200);
    }, duration);
}
