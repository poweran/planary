/**
 * Планарий — Header
 */

import { createElement } from '../utils/dom.js';
import { ThemeToggle } from './ThemeToggle.js';
import { renderTagFilter } from './TagFilter.js';
import { renderStreak } from './StreakCounter.js';
import { focusTimer } from './FocusTimer.js';
import { events, Events } from '../core/events.js';
import { tagService } from '../services/tagService.js';
import { archiveService } from '../services/archiveService.js';
import { TagManager } from './TagManager.js';

export class Header {
    constructor() {
        this.themeToggle = new ThemeToggle();
        this.tagManager = new TagManager();
        this.el = null;
        this.filterContainer = null;
        this.streakContainer = null;
    }

    async init() {
        await this.themeToggle.init();
    }

    async render() {
        this.el = createElement('header', { className: 'header' });

        // Logo
        const logo = createElement('a', {
            className: 'header__logo',
            attrs: { href: '#/' },
            children: [
                createElement('span', { className: 'header__logo-icon', text: '🦎' }),
                createElement('span', { text: 'Планарий' }),
            ],
        });

        // Tag filter
        this.filterContainer = createElement('div', {
            style: { flex: '1', overflow: 'hidden', minWidth: '0' },
        });
        await this._renderFilter();

        // Actions
        const actions = createElement('div', {
            className: 'header__actions',
        });

        // Streak — отдельный контейнер для обновления
        this.streakContainer = createElement('div', { className: 'header__streak-wrap' });
        await this._renderStreak();
        actions.appendChild(this.streakContainer);

        // Навигация: Архив
        const archiveLink = createElement('a', {
            className: 'header__nav-link',
            attrs: { href: '#/archive', title: 'Архив' },
            children: [
                createElement('span', { className: 'header__nav-icon', text: '📦' }),
                createElement('span', { className: 'header__nav-label', text: 'Архив' }),
            ],
        });
        archiveLink.addEventListener('click', (e) => {
            if (window.location.hash === '#/archive') {
                e.preventDefault();
                window.location.hash = '#/';
            }
        });
        actions.appendChild(archiveLink);

        // Навигация: Достижения
        const achieveLink = createElement('a', {
            className: 'header__nav-link',
            attrs: { href: '#/achievements', title: 'Достижения' },
            children: [
                createElement('span', { className: 'header__nav-icon', text: '🏆' }),
                createElement('span', { className: 'header__nav-label', text: 'Цели' }),
            ],
        });
        achieveLink.addEventListener('click', (e) => {
            if (window.location.hash === '#/achievements') {
                e.preventDefault();
                window.location.hash = '#/';
            }
        });
        actions.appendChild(achieveLink);

        // Навигация: Настройки
        const settingsLink = createElement('a', {
            className: 'header__nav-link',
            attrs: { href: '#/settings', title: 'Настройки' },
            children: [
                createElement('span', { className: 'header__nav-icon', text: '⚙️' }),
                createElement('span', { className: 'header__nav-label', text: 'Настройки' }),
            ],
        });
        settingsLink.addEventListener('click', (e) => {
            if (window.location.hash === '#/settings') {
                e.preventDefault();
                window.location.hash = '#/';
            }
        });
        actions.appendChild(settingsLink);

        // Помодоро
        const focusBtn = createElement('a', {
            className: 'header__nav-link',
            attrs: { href: '#/pomodoro', title: 'Фокус-режим (Pomodoro)' },
            children: [
                createElement('span', { className: 'header__nav-icon', text: '🍅' }),
                createElement('span', { className: 'header__nav-label', text: 'Фокус' }),
            ],
        });
        focusBtn.addEventListener('click', (e) => {
            if (window.location.hash === '#/pomodoro') {
                e.preventDefault();
                window.location.hash = '#/';
            }
        });
        actions.appendChild(focusBtn);

        // Управление тегами
        actions.appendChild(this.tagManager.render());

        // Переключатель темы
        actions.appendChild(this.themeToggle.render());

        this.el.appendChild(logo);
        this.el.appendChild(this.filterContainer);
        this.el.appendChild(actions);

        // Обновляем фильтр при изменении тегов
        events.on(Events.TAG_CREATED, () => this._renderFilter());
        events.on(Events.TAG_DELETED, () => this._renderFilter());
        events.on(Events.FILTER_CHANGED, () => this._renderFilter());

        // Обновляем streak при завершении/возврате задачи
        events.on(Events.TASK_COMPLETED, () => this._renderStreak());
        events.on(Events.TASK_UPDATED, () => this._renderStreak());

        return this.el;
    }

    async _renderFilter() {
        const tags = await tagService.getAll();
        this.filterContainer.innerHTML = '';
        this.filterContainer.appendChild(renderTagFilter(tags));
    }

    async _renderStreak() {
        if (!this.streakContainer) return;
        this.streakContainer.innerHTML = '';
        const streak = await archiveService.getStreakDays();
        if (streak > 0) {
            const el = renderStreak(streak);
            if (el) this.streakContainer.appendChild(el);
        }
    }
}
