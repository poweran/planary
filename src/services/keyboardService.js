/**
 * Планарий — Клавиатурные шорткаты
 */

import { events, Events } from '../core/events.js';
import { router } from '../core/router.js';

class KeyboardService {
    constructor() {
        this._active = false;
        this._handler = null;
    }

    start() {
        if (this._active) return;
        this._active = true;

        this._handler = (e) => {
            // Игнорируем, если фокус в input/textarea
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.contentEditable === 'true') return;
            // Игнорируем если модификаторы (кроме Shift)
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            switch (e.key) {
                case 'n':
                case 'N':
                    e.preventDefault();
                    this._focusInput('today');
                    break;
                case '1':
                    e.preventDefault();
                    this._focusInput('today');
                    break;
                case '2':
                    e.preventDefault();
                    this._focusInput('tomorrow');
                    break;
                case '3':
                    e.preventDefault();
                    this._focusInput('chaos');
                    break;
                case '4':
                    e.preventDefault();
                    this._focusInput('future');
                    break;
                case 'p':
                case 'P':
                    e.preventDefault();
                    window.print();
                    break;
                case '/':
                    e.preventDefault();
                    this._openSearch();
                    break;
                case '?':
                    e.preventDefault();
                    this._showHelp();
                    break;
                case 'Escape':
                    this._closeHelp();
                    break;
            }
        };

        document.addEventListener('keydown', this._handler);
    }

    stop() {
        if (this._handler) {
            document.removeEventListener('keydown', this._handler);
        }
        this._active = false;
    }

    _focusInput(areaId) {
        // Переходим на главную если не на ней
        if (location.hash !== '#/' && location.hash !== '') {
            location.hash = '#/';
            setTimeout(() => this._doFocusInput(areaId), 200);
        } else {
            this._doFocusInput(areaId);
        }
    }

    _doFocusInput(areaId) {
        const area = document.querySelector(`.area[data-area-id="${areaId}"]`);
        if (!area) return;
        const input = area.querySelector('.task-input__field');
        if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    _openSearch() {
        const searchBtn = document.querySelector('.header__search-btn');
        if (searchBtn) searchBtn.click();
    }

    _showHelp() {
        // Убираем предыдущую
        this._closeHelp();

        const overlay = document.createElement('div');
        overlay.className = 'shortcuts-overlay';
        overlay.innerHTML = `
            <div class="shortcuts-modal">
                <h3>⌨️ Клавиатурные шорткаты</h3>
                <table class="shortcuts-table">
                    <tr><td><kbd>N</kbd> / <kbd>1</kbd></td><td>Новая задача → Сегодня</td></tr>
                    <tr><td><kbd>2</kbd></td><td>Новая задача → Завтра</td></tr>
                    <tr><td><kbd>3</kbd></td><td>Новая задача → Хаос</td></tr>
                    <tr><td><kbd>4</kbd></td><td>Новая задача → На будущее</td></tr>
                    <tr><td><kbd>/</kbd></td><td>Глобальный поиск</td></tr>
                    <tr><td><kbd>P</kbd></td><td>Печать</td></tr>
                    <tr><td><kbd>?</kbd></td><td>Эта справка</td></tr>
                    <tr><td><kbd>Esc</kbd></td><td>Закрыть</td></tr>
                </table>
                <p style="margin-top: 1rem; color: var(--color-text-tertiary); font-size: var(--font-size-xs);">
                    Шорткаты не работают, когда курсор в поле ввода
                </p>
            </div>
        `;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this._closeHelp();
        });

        document.body.appendChild(overlay);
    }

    _closeHelp() {
        const existing = document.querySelector('.shortcuts-overlay');
        if (existing) existing.remove();
    }
}

export const keyboardService = new KeyboardService();
