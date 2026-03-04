/**
 * Планарий — Переключатель темы
 * Цикл: system → light → dark → system
 */

import { createElement, svgIcon, Icons } from '../utils/dom.js';
import { getSetting, setSetting } from '../core/db.js';
import { events, Events } from '../core/events.js';

// Порядок переключения
const THEMES = ['system', 'light', 'dark'];

const THEME_META = {
    system: { icon: () => Icons.monitor, label: 'Тема: авто' },
    light: { icon: () => Icons.sun, label: 'Тема: светлая' },
    dark: { icon: () => Icons.moon, label: 'Тема: тёмная' },
};

export class ThemeToggle {
    constructor() {
        this.currentTheme = 'system';
        this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }

    async init() {
        this.currentTheme = await getSetting('theme', 'system');
        this.applyTheme(this.currentTheme);

        // Следим за изменением системной темы, чтобы перекрашивать страницу в режиме "авто"
        this._mediaQuery.addEventListener('change', () => {
            if (this.currentTheme === 'system') {
                this.applyTheme('system');
                if (this._btn) this._updateIcon(this._btn);
            }
        });
    }

    render() {
        const btn = createElement('button', {
            className: 'theme-toggle',
            attrs: { 'aria-label': 'Переключить тему' },
        });

        this._btn = btn;
        this._updateIcon(btn);

        btn.addEventListener('click', async () => {
            const idx = THEMES.indexOf(this.currentTheme);
            this.currentTheme = THEMES[(idx + 1) % THEMES.length];

            await setSetting('theme', this.currentTheme);

            document.documentElement.classList.add('theme-transitioning');
            this.applyTheme(this.currentTheme);
            this._updateIcon(btn);
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
            }, 500);

            events.emit(Events.THEME_CHANGED, this.currentTheme);
        });

        return btn;
    }

    applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'system') {
            html.removeAttribute('data-theme');
        } else {
            html.setAttribute('data-theme', theme);
        }
    }

    _updateIcon(btn) {
        const meta = THEME_META[this.currentTheme];
        btn.innerHTML = svgIcon(meta.icon(), 20);
        btn.title = meta.label;
    }
}
